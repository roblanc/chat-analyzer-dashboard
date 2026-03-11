const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_CONTEXT_CHARS = 10000;
const CHAT_CHUNK_TARGET_CHARS = 1600;
const REQUEST_TIMEOUT_MS = 8000;
const RETRIABLE_STATUS = new Set([429, 500, 503, 504]);
const STOPWORDS = new Set([
  'si', 'sau', 'iar', 'dar', 'de', 'din', 'la', 'cu', 'pe', 'in', 'este', 'sunt', 'o', 'un', 'una',
  'ce', 'cine', 'cand', 'cum', 'care', 'cat', 'cata', 'cati', 'cate', 'despre',
  'zic', 'zice', 'zici', 'zis', 'spun', 'spune', 'spui', 'spus',
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'for', 'on', 'in', 'is', 'are', 'was', 'were', 'it', 'this',
  'http', 'https', 'www', 'com', 'ro',
]);

let cachedKnowledge = null;
let cachedChatChunks = null;
let cachedChatDf = null;
let cachedChatDocCount = 0;

const normalizeText = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const tokenize = (text) => {
  const normalized = normalizeText(text);
  return normalized
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token));
};

const stripLeadingMarks = (value) =>
  String(value || '').replace(/^[\u200e\u200f\u202a-\u202e\u2066-\u2069]+/g, '');

const splitIntoChunks = (text) => {
  const sections = text.split(/\n(?=##\s)/g).map((chunk) => chunk.trim());
  const filtered = sections.filter(Boolean);

  if (filtered.length > 1) {
    return filtered;
  }

  return text.split(/\n{2,}/g).map((chunk) => chunk.trim()).filter(Boolean);
};

const CHAT_LINE_RE =
  /^\[(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2}):(\d{2})\]\s(.*)$/;

const parseChatLineStart = (line) => {
  const match = stripLeadingMarks(line).match(CHAT_LINE_RE);
  if (!match) {
    return null;
  }

  const [, dd, mm, yyyy, hh, min, ss, rest] = match;
  const timestamp = `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;

  const separatorIndex = rest.indexOf(': ');
  if (separatorIndex === -1) {
    return { timestamp, author: null, text: rest || '' };
  }

  const author = rest.slice(0, separatorIndex).trim() || null;
  const text = rest.slice(separatorIndex + 2);
  return { timestamp, author, text };
};

const parseWhatsAppTranscript = (content) => {
  const lines = String(content || '').split(/\r?\n/);
  const messages = [];
  let current = null;

  lines.forEach((rawLine) => {
    const line = stripLeadingMarks(rawLine);
    const start = parseChatLineStart(line);

    if (start) {
      if (current) {
        messages.push(current);
      }
      current = { ...start };
      return;
    }

    if (!current) {
      return;
    }

    current.text = `${current.text}\n${line}`.trimEnd();
  });

  if (current) {
    messages.push(current);
  }

  return messages;
};

const cleanChatMessageText = (messageText) => {
  const raw = stripLeadingMarks(String(messageText || ''));
  const cleaned = raw.replace(/\s*[\u200e\u200f]?\b(image|audio|video|sticker)\s+omitted\b/gi, '').trim();
  return cleaned;
};

const shouldSkipChatMessage = (messageText) => cleanChatMessageText(messageText).length === 0;

const buildChatChunks = (messages) => {
  const chunks = [];
  let buffer = '';
  let startTs = '';
  let endTs = '';
  const authors = new Set();

  const flush = () => {
    const text = buffer.trim();
    if (!text) {
      buffer = '';
      startTs = '';
      endTs = '';
      authors.clear();
      return;
    }

    chunks.push({
      kind: 'chat',
      id: chunks.length,
      text,
      start: startTs,
      end: endTs,
      authors: Array.from(authors),
    });

    buffer = '';
    startTs = '';
    endTs = '';
    authors.clear();
  };

  messages.forEach((message) => {
    if (!message || shouldSkipChatMessage(message.text)) {
      return;
    }

    const header = message.author ? `[${message.timestamp}] ${message.author}: ` : `[${message.timestamp}] `;
    const entryText = cleanChatMessageText(message.text);
    if (!entryText) {
      return;
    }
    const entry = `${header}${entryText}`.trim();

    if (!startTs) {
      startTs = message.timestamp;
    }
    endTs = message.timestamp;
    if (message.author) {
      authors.add(message.author);
    }

    if (buffer && buffer.length + entry.length + 1 > CHAT_CHUNK_TARGET_CHARS) {
      flush();
    }

    if (entry.length > CHAT_CHUNK_TARGET_CHARS) {
      buffer = `${buffer}${buffer ? '\n' : ''}${entry.slice(0, CHAT_CHUNK_TARGET_CHARS - 1)}…`;
      flush();
      return;
    }

    buffer = `${buffer}${buffer ? '\n' : ''}${entry}`;
  });

  flush();
  return chunks;
};

const scoreChunk = (chunk, tokens, options = {}) => {
  if (!tokens.length) {
    return 0;
  }

  const df = options.df || null;
  const docCount = options.docCount || 0;
  const normalized = normalizeText(chunk);
  let score = 0;

  tokens.forEach((token) => {
    if (token.length < 2) {
      return;
    }

    let index = normalized.indexOf(token);
    while (index !== -1) {
      if (df && docCount) {
        const tokenDf = df.get(token) || 0;
        const idf = Math.log((docCount + 1) / (tokenDf + 1)) + 1;
        score += idf;
      } else {
        score += 1;
      }
      index = normalized.indexOf(token, index + token.length);
    }
  });

  return score;
};

const summarizeDoc = (doc) => {
  const lines = String(doc?.text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const heading = doc?.kind === 'knowledge' ? lines.find((line) => line.startsWith('##')) : null;
  const firstLine = lines[0] || '';
  const snippet = heading || firstLine;
  if (snippet.length > 180) {
    return `${snippet.slice(0, 180)}…`;
  }
  return snippet;
};

const resolveExistingPath = (paths) => {
  for (let index = 0; index < paths.length; index += 1) {
    const candidate = paths[index];
    if (!candidate) {
      continue;
    }
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (error) {
      // ignore invalid paths
    }
  }
  return null;
};

const loadKnowledge = () => {
  if (cachedKnowledge !== null) {
    return cachedKnowledge;
  }

  const knowledgePath = resolveExistingPath([
    path.resolve(process.cwd(), 'public', 'knowledge.md'),
    path.resolve(__dirname, 'public', 'knowledge.md'),
    path.resolve(__dirname, '..', '..', 'public', 'knowledge.md'),
  ]);

  if (!knowledgePath) {
    cachedKnowledge = '';
    return cachedKnowledge;
  }

  cachedKnowledge = fs.readFileSync(knowledgePath, 'utf8');
  return cachedKnowledge;
};

const loadChatIndex = () => {
  const indexPath = resolveExistingPath([
    path.resolve(process.cwd(), 'netlify', 'data', 'chat.index.json'),
    path.resolve(__dirname, 'data', 'chat.index.json'),
    path.resolve(__dirname, '..', '..', 'netlify', 'data', 'chat.index.json'),
  ]);

  if (!indexPath) {
    return null;
  }

  try {
    const raw = fs.readFileSync(indexPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.chunks)) {
      return null;
    }
    return parsed;
  } catch (error) {
    return null;
  }
};

const loadChatChunks = () => {
  if (cachedChatChunks) {
    return cachedChatChunks;
  }

  const prebuilt = loadChatIndex();
  if (prebuilt) {
    const chunks = prebuilt.chunks
      .filter((chunk) => chunk && typeof chunk.text === 'string' && chunk.text.trim().length > 0)
      .map((chunk, index) => ({
        kind: 'chat',
        id: Number.isFinite(chunk.id) ? chunk.id : index,
        text: chunk.text,
        start: chunk.start || null,
        end: chunk.end || null,
        authors: Array.isArray(chunk.authors) ? chunk.authors.filter(Boolean) : [],
      }));

    cachedChatChunks = chunks;
    cachedChatDocCount = chunks.length;
    cachedChatDf = new Map();

    const dfObject = prebuilt.df && typeof prebuilt.df === 'object' ? prebuilt.df : null;
    if (dfObject) {
      Object.entries(dfObject).forEach(([token, value]) => {
        if (!token) {
          return;
        }
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
          return;
        }
        cachedChatDf.set(token, numeric);
      });
    }

    if (cachedChatDf.size === 0) {
      cachedChatChunks.forEach((chunk) => {
        const uniqueTokens = new Set(tokenize(chunk.text));
        uniqueTokens.forEach((token) => {
          cachedChatDf.set(token, (cachedChatDf.get(token) || 0) + 1);
        });
      });
    }

    return cachedChatChunks;
  }

  const envPath = (process.env.CHAT_ARCHIVE_PATH || '').trim();
  const resolvedEnvPath = envPath
    ? path.isAbsolute(envPath)
      ? envPath
      : path.resolve(process.cwd(), envPath)
    : '';

  const transcriptPath = resolveExistingPath([
    resolvedEnvPath,
    path.resolve(process.cwd(), 'netlify', 'data', 'chat.txt'),
    path.resolve(process.cwd(), 'WhatsApp Chat - ChatGPT (1)', '_chat.txt'),
    path.resolve(__dirname, 'data', 'chat.txt'),
    path.resolve(__dirname, '..', '..', 'netlify', 'data', 'chat.txt'),
    path.resolve(__dirname, '..', '..', 'WhatsApp Chat - ChatGPT (1)', '_chat.txt'),
  ]);

  if (!transcriptPath) {
    cachedChatChunks = [];
    cachedChatDf = new Map();
    cachedChatDocCount = 0;
    return cachedChatChunks;
  }

  const transcript = fs.readFileSync(transcriptPath, 'utf8');
  const messages = parseWhatsAppTranscript(transcript);
  cachedChatChunks = buildChatChunks(messages);
  cachedChatDf = new Map();
  cachedChatDocCount = cachedChatChunks.length;
  cachedChatChunks.forEach((chunk) => {
    const uniqueTokens = new Set(tokenize(chunk.text));
    uniqueTokens.forEach((token) => {
      cachedChatDf.set(token, (cachedChatDf.get(token) || 0) + 1);
    });
  });
  return cachedChatChunks;
};

const buildContext = (question, knowledge, chatChunks) => {
  const knowledgeChunks = splitIntoChunks(knowledge || '').map((text, index) => ({
    kind: 'knowledge',
    id: index,
    text,
  }));

  const tokens = tokenize(question);
  const importantTokens = tokens.filter((token) => token.length >= 4);
  const documents = [...knowledgeChunks, ...(chatChunks || [])];
  const scored = documents.map((doc) => ({
    doc,
    score:
      doc.kind === 'chat'
        ? scoreChunk(doc.text, tokens, { df: cachedChatDf, docCount: cachedChatDocCount })
        : scoreChunk(doc.text, tokens),
    hitsImportant:
      importantTokens.length === 0
        ? true
        : importantTokens.some((token) => normalizeText(doc.text).includes(token)),
  }));

  const candidates = scored.filter((item) => item.score > 0);
  const gatedCandidates = importantTokens.length ? candidates.filter((item) => item.hitsImportant) : [];
  const pool = gatedCandidates.length ? gatedCandidates : candidates;
  const sorted = pool.sort((a, b) => b.score - a.score).slice(0, 6);

  if (!sorted.length) {
    const context = String(knowledge || '').slice(0, MAX_CONTEXT_CHARS);
    return { context, sources: [] };
  }

  const parts = [];
  const sources = [];
  let usedChars = 0;

  sorted.forEach(({ doc }) => {
    if (usedChars >= MAX_CONTEXT_CHARS) {
      return;
    }

    const header =
      doc.kind === 'chat'
        ? `SURSA: CHAT (${doc.start || 'n/a'}${doc.end && doc.end !== doc.start ? ` - ${doc.end}` : ''})`
        : 'SURSA: REZUMAT';

    const block = `${header}\n${doc.text}`.trim();
    const remaining = MAX_CONTEXT_CHARS - usedChars;
    const trimmed = block.length > remaining ? `${block.slice(0, remaining - 1)}…` : block;
    parts.push(trimmed);
    usedChars += trimmed.length + 6;

    sources.push({
      kind: doc.kind,
      id: doc.id,
      snippet: summarizeDoc(doc),
      ...(doc.kind === 'chat'
        ? { start: doc.start || null, end: doc.end || null, authors: doc.authors || [] }
        : null),
    });
  });

  const context = parts.join('\n\n---\n\n').slice(0, MAX_CONTEXT_CHARS);
  return { context, sources };
};

const getModels = () => {
  const envValue = (process.env.GEMINI_MODELS || '').trim();
  if (!envValue) {
    return DEFAULT_MODELS;
  }

  const models = envValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return models.length ? Array.from(new Set(models)) : DEFAULT_MODELS;
};

const createError = (message, options = {}) => {
  const error = new Error(message);
  Object.assign(error, options);
  return error;
};

const isRetriableMessage = (message = '') =>
  /high demand|resource_exhausted|quota|rate|temporar|overload|busy/i.test(message);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callGemini = async (model, prompt) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const details = errorPayload.error?.message || errorPayload.message || response.statusText;
      const retriable = RETRIABLE_STATUS.has(response.status) || isRetriableMessage(details);
      throw createError(details || 'Gemini API error', { status: response.status, retriable });
    }

    const data = await response.json();
    const textParts = data?.candidates?.[0]?.content?.parts || [];
    const answerText = textParts.map((part) => part.text || '').join('').trim();
    return { answerText, model };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createError('Request timed out', { retriable: true });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Missing GEMINI_API_KEY' }),
    };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Invalid JSON payload' }),
    };
  }

  const question = (payload.question || '').trim();
  if (!question) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Missing question' }),
    };
  }

  const knowledge = loadKnowledge();
  const chatChunks = loadChatChunks();
  const { context, sources } = buildContext(question, knowledge, chatChunks);

  const prompt = `Ești un asistent care răspunde doar din CONTEXT (fragmente din arhiva conversațiilor + un rezumat).
Dacă răspunsul nu apare în CONTEXT, răspunde exact: "Nu știu din conținutul disponibil.".
Răspunde în aceeași limbă ca întrebarea.
Oferă un răspuns concis și o justificare scurtă bazată pe context, fără să inventezi detalii.

CONTEXT:
${context}

ÎNTREBARE:
${question}

RĂSPUNS:`;

  try {
    const models = getModels();
    let result = null;
    let lastError = null;

    for (let index = 0; index < models.length; index += 1) {
      const model = models[index];
      try {
        result = await callGemini(model, prompt);
        break;
      } catch (error) {
        lastError = error;
        if (error.retriable && index < models.length - 1) {
          await delay(250);
          continue;
        }
        throw error;
      }
    }

    if (!result) {
      throw lastError || new Error('Gemini API error');
    }

    const answer = result.answerText || 'Nu știu din conținutul disponibil.';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answer, sources, model: result.model }),
    };
  } catch (error) {
    const retriable = Boolean(error.retriable) || isRetriableMessage(error.message);
    const errorMessage = retriable
      ? 'Modelul este ocupat. Încearcă din nou în câteva momente.'
      : 'AI request failed';
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: errorMessage,
        details: error.message,
      }),
    };
  }
};
