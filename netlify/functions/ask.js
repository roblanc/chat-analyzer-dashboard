const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_CONTEXT_CHARS = 10000;
const REQUEST_TIMEOUT_MS = 8000;
const RETRIABLE_STATUS = new Set([429, 500, 503, 504]);
const STOPWORDS = new Set([
  'si', 'sau', 'iar', 'dar', 'de', 'din', 'la', 'cu', 'pe', 'in', 'în', 'este', 'sunt', 'o', 'un', 'una',
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'for', 'on', 'in', 'is', 'are', 'was', 'were', 'it', 'this',
]);

let cachedKnowledge = null;

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

const splitIntoChunks = (text) => {
  const sections = text.split(/\n(?=##\s)/g).map((chunk) => chunk.trim());
  const filtered = sections.filter(Boolean);

  if (filtered.length > 1) {
    return filtered;
  }

  return text.split(/\n{2,}/g).map((chunk) => chunk.trim()).filter(Boolean);
};

const scoreChunk = (chunk, tokens) => {
  if (!tokens.length) {
    return 0;
  }

  const normalized = normalizeText(chunk);
  let score = 0;

  tokens.forEach((token) => {
    if (token.length < 2) {
      return;
    }

    let index = normalized.indexOf(token);
    while (index !== -1) {
      score += 1;
      index = normalized.indexOf(token, index + token.length);
    }
  });

  return score;
};

const summarizeChunk = (chunk) => {
  const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
  const heading = lines.find((line) => line.startsWith('##'));
  const snippet = heading || lines[0] || '';
  if (snippet.length > 180) {
    return `${snippet.slice(0, 180)}…`;
  }
  return snippet;
};

const loadKnowledge = () => {
  if (cachedKnowledge) {
    return cachedKnowledge;
  }

  const knowledgePath = path.resolve(__dirname, '..', '..', 'public', 'knowledge.md');
  const knowledge = fs.readFileSync(knowledgePath, 'utf8');
  cachedKnowledge = knowledge;
  return knowledge;
};

const buildContext = (question, knowledge) => {
  const chunks = splitIntoChunks(knowledge);
  const tokens = tokenize(question);
  const scored = chunks.map((chunk, index) => ({
    chunk,
    index,
    score: scoreChunk(chunk, tokens),
  }));

  const sorted = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (!sorted.length) {
    const context = knowledge.slice(0, MAX_CONTEXT_CHARS);
    return { context, sources: [] };
  }

  const context = sorted
    .map((item) => item.chunk)
    .join('\n\n---\n\n')
    .slice(0, MAX_CONTEXT_CHARS);

  const sources = sorted.map((item) => ({
    id: item.index,
    snippet: summarizeChunk(item.chunk),
  }));

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
  const { context, sources } = buildContext(question, knowledge);

  const prompt = `Ești un asistent care răspunde doar din CONTEXT.
Dacă răspunsul nu apare în CONTEXT, răspunde exact: "Nu știu din conținutul disponibil.".
Răspunde în aceeași limbă ca întrebarea.

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
