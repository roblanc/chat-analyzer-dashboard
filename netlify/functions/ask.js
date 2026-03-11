const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_CONTEXT_CHARS = 10000;
const MAX_CONTEXT_CHARS_PROFILE = 18000;
const CHAT_CHUNK_TARGET_CHARS = 1600;
const REQUEST_TIMEOUT_MS = 20000;
const RETRIABLE_STATUS = new Set([429, 500, 503, 504]);
const STOPWORDS = new Set([
  'si', 'sau', 'iar', 'dar', 'de', 'din', 'la', 'cu', 'pe', 'in', 'este', 'sunt', 'o', 'un', 'una',
  'ce', 'cine', 'cand', 'cum', 'care', 'cat', 'cata', 'cati', 'cate', 'despre',
  'stiu', 'stie', 'stii', 'stim', 'stiti',
  'zic', 'zice', 'zici', 'zis', 'spun', 'spune', 'spui', 'spus',
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'for', 'on', 'in', 'is', 'are', 'was', 'were', 'it', 'this',
  'http', 'https', 'www', 'com', 'ro',
]);

let cachedKnowledge = null;
let cachedDashboardStats = undefined;
let cachedChatChunks = null;
let cachedChatDf = null;
let cachedChatDocCount = 0;
let cachedAuthorProfiles = null;

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

const uniq = (items) => Array.from(new Set(items.filter(Boolean)));

const QUESTION_INTENT = {
  analysis: /(\bcel\s+mai\b|\bcea\s+mai\b|\btop\b|\branking\b|\bcompar|\bpare\b|\bwho\b|\bwhich\b|\bbest\b|\bmost\b)/i,
  profile:
    /(\bce\s+stii\s+despre\b|\bce\s+stie\s+despre\b|\bspune-mi\s+despre\b|\bspune\s+despre\b|\bce\s+poti\s+spune\s+despre\b|\bdescrie\b|\bprofil\b|\bcaracterizeaza\b|\bcine\s+e\b|\bdeduce\b|\bdeducii\b|\bimpresie\b|\bce\s+poti\s+deduce\b|\bce\s+poti\s+trage\b|\bce\s+crezi\s+despre\b|\banalizeaza\b|\bpersonalitate\b|\bcaracter\b|\bfel\s+de\s+om\b)/i,
  smartness: /(destept|inteligent|smart|geniu|creier|brain)/i,
};

const HINT_TOKENS_SMARTNESS = [
  'cod',
  'api',
  'server',
  'github',
  'netlify',
  'xml',
  'json',
  'script',
  'node',
  'react',
  'debug',
  'bug',
  'error',
  'licenta',
  'windows',
  'driver',
  'calculator',
  'pc',
  'it',
  'tehnic',
  'tehnologie',
];

const detectIntent = (question, options = {}) => {
  const normalized = normalizeText(question || '');
  const focusAuthor = options.focusAuthor || null;
  const normalizedFocus = focusAuthor ? normalizeText(focusAuthor) : '';
  const wordCount = normalized.split(/[^a-z0-9]+/).filter(Boolean).length;
  const hasFocus = normalizedFocus ? normalized.includes(normalizedFocus) : false;
  const isProfile = QUESTION_INTENT.profile.test(normalized) || (hasFocus && wordCount <= 3);
  return {
    isAnalysis: QUESTION_INTENT.analysis.test(normalized) || isProfile,
    isSmartness: QUESTION_INTENT.smartness.test(normalized),
    isProfile,
  };
};

const expandTokens = (question, tokens, intent) => {
  const extra = [];

  if (intent?.isSmartness) {
    extra.push(...HINT_TOKENS_SMARTNESS);
  }

  if (/\bR\b/.test(String(question || ''))) {
    extra.push('robert');
  }

  return uniq([...tokens, ...extra]).filter((token) => !STOPWORDS.has(token));
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

const summarizeDoc = (doc, options = {}) => {
  const lines = String(doc?.text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const focusAuthor = options.focusAuthor || null;
  if (doc?.kind === 'chat' && focusAuthor) {
    const aliases = getChatAuthorAliases(focusAuthor);
    const markers = aliases.map((alias) => `] ${alias}:`).filter(Boolean);
    const focusLine = markers.length ? lines.find((line) => markers.some((marker) => line.includes(marker))) : null;
    if (focusLine) {
      return focusLine.length > 180 ? `${focusLine.slice(0, 180)}…` : focusLine;
    }
  }

  const focusTokens = Array.isArray(options.focusTokens) ? options.focusTokens : [];
  if (doc?.kind === 'chat' && focusTokens.length) {
    const focusLine = lines.find((line) => {
      const normalized = normalizeText(line);
      return focusTokens.some((token) => normalized.includes(token));
    });
    if (focusLine) {
      return focusLine.length > 180 ? `${focusLine.slice(0, 180)}…` : focusLine;
    }
  }

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

const loadDashboardStats = () => {
  if (cachedDashboardStats !== undefined) {
    return cachedDashboardStats;
  }

  const statsPath = resolveExistingPath([
    path.resolve(process.cwd(), 'public', 'dashboard-stats.json'),
    path.resolve(__dirname, 'public', 'dashboard-stats.json'),
    path.resolve(__dirname, '..', '..', 'public', 'dashboard-stats.json'),
  ]);

  if (!statsPath) {
    cachedDashboardStats = null;
    return cachedDashboardStats;
  }

  try {
    cachedDashboardStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  } catch (error) {
    cachedDashboardStats = null;
  }

  return cachedDashboardStats;
};

const getKnownAuthors = (stats) => {
  const authors = stats?.labels?.authors;
  if (Array.isArray(authors) && authors.length) {
    return authors.filter(Boolean);
  }

  return ['Unde', 'Marius Motoi', 'Baldo', 'Vasile', 'R'];
};

// Partial name → canonical author mapping. Keys must be lowercased + diacritics stripped.
const AUTHOR_PARTIAL_MAP = {
  'marius': 'Marius Motoi',
  'motoi': 'Marius Motoi',
  'marius motoi': 'Marius Motoi',
  'baldo': 'Baldo',
  'vasile': 'Vasile',
  'unde': 'Unde',
  'robert': 'R',
  'robi': 'R',
};

const extractFocusAuthor = (question, stats) => {
  const normalizedQuestion = normalizeText(question || '');
  const candidates = getKnownAuthors(stats);

  if (normalizedQuestion.includes('robert') && candidates.includes('R')) {
    return 'R';
  }

  // Full name match first (e.g. "Marius Motoi")
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (!candidate) {
      continue;
    }
    if (candidate.length === 1) {
      continue;
    }
    if (normalizedQuestion.includes(normalizeText(candidate))) {
      return candidate;
    }
  }

  // Partial name match via AUTHOR_PARTIAL_MAP
  const partialKeys = Object.keys(AUTHOR_PARTIAL_MAP).sort((a, b) => b.length - a.length);
  for (let index = 0; index < partialKeys.length; index += 1) {
    const key = partialKeys[index];
    const regex = new RegExp(`\\b${key}\\b`);
    if (regex.test(normalizedQuestion)) {
      const mapped = AUTHOR_PARTIAL_MAP[key];
      if (candidates.includes(mapped) || mapped === 'R') {
        return mapped;
      }
    }
  }

  if (candidates.includes('R') && /\br\b/.test(normalizedQuestion)) {
    return 'R';
  }

  return null;
};

const getChatAuthorAliases = (focusAuthor) => {
  if (!focusAuthor) {
    return [];
  }

  if (focusAuthor === 'R') {
    return ['Robert', 'R'];
  }

  if (focusAuthor === 'Marius Motoi') {
    return ['Marius Motoi', 'Marius', 'Motoi'];
  }

  return [focusAuthor];
};

const renderStatsContext = (stats, options = {}) => {
  if (!stats || typeof stats !== 'object') {
    return '';
  }

  const combined = stats.combined || {};
  const incremental = stats.incremental || {};
  const legacy = stats.legacy || {};
  const focusAuthor = options.focusAuthor || null;

  const combinedAuthors =
    combined.authors && typeof combined.authors === 'object' ? combined.authors : null;
  const incrementalAuthors =
    incremental.authors && typeof incremental.authors === 'object' ? incremental.authors : null;
  const legacyAuthors = legacy.authors && typeof legacy.authors === 'object' ? legacy.authors : null;

  if (focusAuthor && combinedAuthors && Object.prototype.hasOwnProperty.call(combinedAuthors, focusAuthor)) {
    const totalForAuthor = Number(combinedAuthors[focusAuthor] || 0);
    const legacyForAuthor = legacyAuthors ? Number(legacyAuthors[focusAuthor] || 0) : null;
    const incrementalForAuthor = incrementalAuthors ? Number(incrementalAuthors[focusAuthor] || 0) : null;

    const ranked = Object.entries(combinedAuthors)
      .map(([name, count]) => [name, Number(count || 0)])
      .sort((a, b) => b[1] - a[1]);
    const rankIndex = ranked.findIndex(([name]) => name === focusAuthor);
    const rankLabel = rankIndex === -1 ? null : `${rankIndex + 1}/${ranked.length}`;

    const totalMessages = Number(combined.totalMessages || 0);
    const share = totalMessages ? totalForAuthor / totalMessages : null;

    const lines = [
      `STATISTICI (Dashboard) - focus: ${focusAuthor}`,
      totalForAuthor ? `- Mesaje (total): ${totalForAuthor.toLocaleString('ro-RO')}` : null,
      legacyForAuthor != null ? `- Mesaje legacy: ${legacyForAuthor.toLocaleString('ro-RO')}` : null,
      incrementalForAuthor != null
        ? `- Mesaje noi (${incremental?.period?.start || 'n/a'} – ${incremental?.period?.end || 'n/a'}): ${incrementalForAuthor.toLocaleString(
            'ro-RO'
          )}`
        : null,
      rankLabel ? `- Rank după volum: ${rankLabel}` : null,
      share != null ? `- Pondere din total: ${(share * 100).toFixed(1)}%` : null,
    ]
      .filter(Boolean)
      .join('\n');

    return lines.trim();
  }

  const authorLines = combinedAuthors
    ? Object.entries(combinedAuthors)
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .map(([name, count]) => `- ${name}: ${Number(count || 0).toLocaleString('ro-RO')} mesaje`)
        .join('\n')
    : '';

  const lines = [
    'STATISTICI (Dashboard)',
    combined.totalMessages != null ? `- Total mesaje (legacy + noi): ${Number(combined.totalMessages).toLocaleString('ro-RO')}` : null,
    incremental.totalMessages != null
      ? `- Mesaje noi (${incremental?.period?.start || 'n/a'} – ${incremental?.period?.end || 'n/a'}): ${Number(
          incremental.totalMessages
        ).toLocaleString('ro-RO')}`
      : null,
    combined.daysAnalyzed != null ? `- Zile analizate (legacy + noi): ${Number(combined.daysAnalyzed).toLocaleString('ro-RO')}` : null,
    combined.peakWeekday?.label ? `- Zi de vârf (total): ${combined.peakWeekday.label}` : null,
    incremental.peakHour?.label ? `- Vârf orar (noi): ${incremental.peakHour.label}` : null,
    authorLines ? 'MESAJE PER PERSOANĂ (total):' : null,
    authorLines || null,
  ]
    .filter(Boolean)
    .join('\n');

  return lines.trim();
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
  // Cache author profiles if available in prebuilt index
  if (cachedAuthorProfiles === null) {
    const idx = loadChatIndex();
    cachedAuthorProfiles = (idx && idx.authorProfiles && typeof idx.authorProfiles === 'object')
      ? idx.authorProfiles
      : {};
  }

  return cachedChatChunks;
};

const loadAuthorProfiles = () => {
  if (cachedAuthorProfiles !== null) {
    return cachedAuthorProfiles;
  }
  const idx = loadChatIndex();
  cachedAuthorProfiles = (idx && idx.authorProfiles && typeof idx.authorProfiles === 'object')
    ? idx.authorProfiles
    : {};
  return cachedAuthorProfiles;
};

const buildAuthorProfileDoc = (focusAuthor, authorProfiles) => {
  if (!focusAuthor || !authorProfiles) return null;

  // Try exact match, then alias match
  const aliases = getChatAuthorAliases(focusAuthor);
  let profile = authorProfiles[focusAuthor];
  if (!profile) {
    for (const alias of aliases) {
      if (authorProfiles[alias]) {
        profile = authorProfiles[alias];
        break;
      }
    }
  }
  if (!profile) return null;

  const lines = [`PROFIL INDUCTIV: ${focusAuthor}`];
  if (profile.totalMessages) lines.push(`- Total mesaje analizate: ${profile.totalMessages}`);
  if (profile.avgMessageLength) lines.push(`- Lungime medie mesaj: ${profile.avgMessageLength} caractere`);
  if (profile.shortMessagePct != null) lines.push(`- Mesaje scurte (<20 chars): ${profile.shortMessagePct}%`);
  if (profile.longMessagePct != null) lines.push(`- Mesaje lungi (>150 chars): ${profile.longMessagePct}%`);
  if (profile.peakHour != null) lines.push(`- Oră de vârf: ${profile.peakHour}:00`);
  if (profile.peakDayLabel) lines.push(`- Zi de vârf: ${profile.peakDayLabel}`);
  if (profile.questionPct != null) lines.push(`- Întrebări din total mesaje: ${profile.questionPct}%`);
  if (profile.linkCount != null) lines.push(`- Link-uri distribuite: ${profile.linkCount}`);
  if (profile.topWords && profile.topWords.length) {
    lines.push(`- Cuvinte frecvente: ${profile.topWords.slice(0, 10).map(w => `"${w.term}"(${w.count})`).join(', ')}`);
  }
  if (profile.topPhrases && profile.topPhrases.length) {
    lines.push(`- Fraze caracteristice: ${profile.topPhrases.slice(0, 5).map(p => `"${p.term}"(${p.count})`).join(', ')}`);
  }
  if (profile.exampleMessages && profile.exampleMessages.length) {
    lines.push('- Exemple de mesaje reprezentative:');
    profile.exampleMessages.forEach((ex) => lines.push(`  * ${ex}`));
  }

  return {
    kind: 'authorProfile',
    id: focusAuthor,
    text: lines.join('\n'),
  };
};

const AUTHOR_EXAMPLE_MAX_LINES = 42;
const AUTHOR_EXAMPLE_MAX_CHARS = 6000;
const AUTHOR_EXAMPLE_MIN_BODY_CHARS = 12;
// Lines per temporal third (early / mid / recent)
const AUTHOR_EXAMPLE_LINES_PER_THIRD = 14;

const truncateSnippet = (value, limit) => {
  const text = String(value || '').trim();
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit - 1)}…`;
};

const buildAuthorExamplesDoc = (chatChunks, focusAuthor) => {
  if (!focusAuthor || !Array.isArray(chatChunks) || chatChunks.length === 0) {
    return null;
  }

  const aliases = getChatAuthorAliases(focusAuthor);
  const markers = aliases.map((alias) => `] ${alias}:`).filter(Boolean);
  if (markers.length === 0) {
    return null;
  }

  const seen = new Set();

  const extractLinesFromRange = (startIndex, endIndex, maxLines) => {
    const result = [];
    let usedChars = 0;
    for (let chunkIndex = endIndex - 1; chunkIndex >= startIndex; chunkIndex -= 1) {
      const chunk = chatChunks[chunkIndex];
      if (!chunk || typeof chunk.text !== 'string') {
        continue;
      }
      const chunkLines = chunk.text.split('\n');
      for (let lineIndex = chunkLines.length - 1; lineIndex >= 0; lineIndex -= 1) {
        const rawLine = chunkLines[lineIndex];
        if (!rawLine) continue;
        const line = stripLeadingMarks(rawLine).trim();
        const marker = markers.find((candidate) => line.includes(candidate));
        if (!marker) continue;
        const bodyIndex = line.indexOf(marker);
        const body = line.slice(bodyIndex + marker.length).trim();
        if (body.length < AUTHOR_EXAMPLE_MIN_BODY_CHARS) continue;
        if (/^[^a-z0-9]+$/i.test(body)) continue;
        const trimmed = truncateSnippet(line, 240);
        if (seen.has(trimmed)) continue;
        if (usedChars + trimmed.length + 1 > AUTHOR_EXAMPLE_MAX_CHARS / 3) break;
        seen.add(trimmed);
        result.push(trimmed);
        usedChars += trimmed.length + 1;
        if (result.length >= maxLines) break;
      }
      if (result.length >= maxLines) break;
    }
    return result;
  };

  // Temporal thirds: sample from early, mid, recent periods independently
  const total = chatChunks.length;
  const third = Math.ceil(total / 3);
  const earlyLines = extractLinesFromRange(0, third, AUTHOR_EXAMPLE_LINES_PER_THIRD);
  const midLines = extractLinesFromRange(third, third * 2, AUTHOR_EXAMPLE_LINES_PER_THIRD);
  const recentLines = extractLinesFromRange(third * 2, total, AUTHOR_EXAMPLE_LINES_PER_THIRD);

  // Interleave: recent first (most relevant), then mid, then early
  const lines = [...recentLines, ...midLines, ...earlyLines].slice(0, AUTHOR_EXAMPLE_MAX_LINES);

  if (lines.length === 0) {
    return null;
  }

  const periodLabel = [
    recentLines.length ? `${recentLines.length} recente` : null,
    midLines.length ? `${midLines.length} din mijloc` : null,
    earlyLines.length ? `${earlyLines.length} vechi` : null,
  ].filter(Boolean).join(', ');

  return {
    kind: 'examples',
    id: focusAuthor,
    text: [`EXEMPLE: ${focusAuthor} (${periodLabel})`, ...lines].join('\n'),
  };
};

const buildContext = (question, knowledge, chatChunks, intent, dashboardStats, focusAuthor) => {
  const contextLimit = intent?.isProfile ? MAX_CONTEXT_CHARS_PROFILE : MAX_CONTEXT_CHARS;

  const knowledgeChunks = splitIntoChunks(knowledge || '').map((text, index) => ({
    kind: 'knowledge',
    id: index,
    text,
  }));

  const rawTokens = tokenize(question);
  const tokens = expandTokens(question, rawTokens, intent);
  const importantTokens = tokens.filter((token) => token.length >= 4);
  const statsText = renderStatsContext(dashboardStats, focusAuthor ? { focusAuthor } : {});
  const statsDoc = statsText
    ? {
        kind: 'stats',
        id: 0,
        text: statsText,
      }
    : null;

  const examplesDoc = intent?.isProfile && focusAuthor ? buildAuthorExamplesDoc(chatChunks, focusAuthor) : null;

  // Inductive profile doc: pre-computed behavioral observations, highest priority for profile questions
  const authorProfiles = loadAuthorProfiles();
  const authorProfileDoc = intent?.isProfile && focusAuthor
    ? buildAuthorProfileDoc(focusAuthor, authorProfiles)
    : null;

  const documents = [
    ...knowledgeChunks,
    ...(statsDoc ? [statsDoc] : []),
    ...(examplesDoc ? [examplesDoc] : []),
    ...(chatChunks || []),
  ];

  const focusChatAliases = focusAuthor ? getChatAuthorAliases(focusAuthor) : [];
  const focusNormalized = focusAuthor && focusAuthor.length > 1 ? normalizeText(focusAuthor) : '';

  const scored = documents.map((doc) => {
    const baseScore =
      doc.kind === 'chat'
        ? scoreChunk(doc.text, tokens, { df: cachedChatDf, docCount: cachedChatDocCount })
        : scoreChunk(doc.text, tokens);

    let score = baseScore;

    if (focusAuthor) {
      if (doc.kind === 'examples') {
        score += 8;
      } else if (doc.kind === 'stats') {
        score += 5;
      } else if (doc.kind === 'knowledge') {
        if (focusNormalized && normalizeText(doc.text).includes(focusNormalized)) {
          score += 4;
        }
      } else if (doc.kind === 'chat') {
        const authors = Array.isArray(doc.authors) ? doc.authors : [];
        const matchesAuthor = focusChatAliases.some((alias) => authors.includes(alias));
        if (matchesAuthor) {
          score += 6;
        } else if (focusNormalized && normalizeText(doc.text).includes(focusNormalized)) {
          score += 2;
        }
      }
    }

    const normalizedDocText = normalizeText(doc.text);
    const hitsImportant =
      importantTokens.length === 0
        ? true
        : importantTokens.some((token) => normalizedDocText.includes(token));

    return {
      doc,
      score,
      hitsImportant,
    };
  });

  const forcedKnowledge = [];
  if (intent?.isAnalysis) {
    const markers = ['vocea ratiunii', 'suport tehnic', 'rolurile grupului', 'interactiunii sociale'];
    knowledgeChunks.forEach((chunk) => {
      const normalized = normalizeText(chunk.text);
      if (markers.some((marker) => normalized.includes(marker))) {
        forcedKnowledge.push(chunk);
      }
    });
  }
  if (intent?.isProfile && focusNormalized) {
    knowledgeChunks.forEach((chunk) => {
      const normalized = normalizeText(chunk.text);
      if (normalized.includes(focusNormalized)) {
        forcedKnowledge.push(chunk);
      }
    });
  }

  const candidates = scored.filter((item) => item.score > 0);
  const gatedCandidates = importantTokens.length ? candidates.filter((item) => item.hitsImportant) : [];
  const pool = gatedCandidates.length ? gatedCandidates : candidates;
  const maxDocs = intent?.isProfile ? 16 : intent?.isAnalysis ? 8 : 6;
  const sorted = pool.sort((a, b) => b.score - a.score).slice(0, maxDocs);

  const selectedDocs = [];
  const selectedKeys = new Set();
  const pushDoc = (doc) => {
    if (!doc) {
      return;
    }
    const key = `${doc.kind}:${doc.id}`;
    if (selectedKeys.has(key)) {
      return;
    }
    selectedKeys.add(key);
    selectedDocs.push(doc);
  };

  const forcedLimit = intent?.isProfile ? 6 : 2;
  const forcedUnique = [];
  const forcedSeen = new Set();
  forcedKnowledge.forEach((chunk) => {
    if (!chunk) {
      return;
    }
    const key = `${chunk.kind}:${chunk.id}`;
    if (forcedSeen.has(key)) {
      return;
    }
    forcedSeen.add(key);
    forcedUnique.push(chunk);
  });

  forcedUnique.slice(0, forcedLimit).forEach(pushDoc);
  // Inductive profile doc gets highest priority — always first for profile questions
  if (authorProfileDoc) {
    pushDoc(authorProfileDoc);
  }
  if (examplesDoc) {
    pushDoc(examplesDoc);
  }
  if (statsDoc) {
    pushDoc(statsDoc);
  }
  sorted.forEach(({ doc }) => pushDoc(doc));

  if (!selectedDocs.length) {
    const fallback = [];
    if (statsDoc) {
      fallback.push(statsDoc.text);
    }
    fallback.push(String(knowledge || '').slice(0, contextLimit));
    const context = fallback.join('\n\n---\n\n').slice(0, contextLimit);
    return { context, sources: statsDoc ? [{ kind: 'stats', id: 0, snippet: 'STATISTICI (Dashboard)' }] : [] };
  }

  const parts = [];
  const sources = [];
  let usedChars = 0;

  selectedDocs.forEach((doc) => {
    if (usedChars >= contextLimit) {
      return;
    }

    const header =
      doc.kind === 'chat'
        ? `SURSA: CHAT (${doc.start || 'n/a'}${doc.end && doc.end !== doc.start ? ` - ${doc.end}` : ''})`
        : doc.kind === 'stats'
          ? 'SURSA: STATISTICI'
          : doc.kind === 'examples'
            ? 'SURSA: EXEMPLE'
            : doc.kind === 'authorProfile'
              ? 'SURSA: PROFIL INDUCTIV'
              : 'SURSA: REZUMAT';

    const block = `${header}\n${doc.text}`.trim();
    const remaining = contextLimit - usedChars;
    const trimmed = block.length > remaining ? `${block.slice(0, remaining - 1)}…` : block;
    parts.push(trimmed);
    usedChars += trimmed.length + 6;

    sources.push({
      kind: doc.kind,
      id: doc.id,
      snippet: summarizeDoc(doc, { focusAuthor, focusTokens: importantTokens }),
      ...(doc.kind === 'chat'
        ? { start: doc.start || null, end: doc.end || null, authors: doc.authors || [] }
        : null),
    });
  });

  const context = parts.join('\n\n---\n\n').slice(0, contextLimit);
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

const callGemini = async (model, prompt, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const maxOutputTokens = options.maxOutputTokens || 1024;

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
          temperature: 0.75,
          maxOutputTokens,
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
  const dashboardStats = loadDashboardStats();
  const focusAuthor = extractFocusAuthor(question, dashboardStats);
  const intent = detectIntent(question, { focusAuthor });
  const chatChunks = loadChatChunks();
  const { context, sources } = buildContext(question, knowledge, chatChunks, intent, dashboardStats, focusAuthor);

  const prompt = `Ești un analist de chat și un psiholog de grup amuzant, prietenos și isteț.
Folosești informațiile din CONTEXT (fragmente din arhiva conversațiilor + rezumat + statistici) ca punct de plecare.
Spre deosebire de un asistent rigid, tu AI VOIE să faci deducții, să speculezi și să "citești printre rânduri" despre personalitatea membrilor (Unde, Marius Motoi, Baldo, Vasile, R).

Tip întrebare (detectat): ${intent.isProfile ? 'PROFIL (ANALIZĂ)' : intent.isAnalysis ? 'ANALIZĂ/OPINIE' : 'FAPT'}
Subiect (dacă există): ${focusAuthor || 'n/a'}

Reguli:
1) Fii creativ și speculativ: trage concluzii despre dinamica grupului pe baza stilului lor de a scrie, frecvenței mesajelor sau a orelor la care scriu.
2) Tonul: folosește un ton prietenos, amuzant, ușor sarcastic (dacă e cazul), exact ca un prieten care observă grupul din exterior.
3) Pentru întrebări factuale stricte, dacă nu știi din context, poți spune că nu știi exact, dar oferă o presupunere amuzantă bazată pe cine ar face acel lucru de obicei.
4) Pentru întrebări de analiză/comparație/opinie: fă asocieri distractive ("Marius e probabil tipul care...", "Vasile pare genul care..."). Oferă dovezi din CONTEXT (timestamp sau statistici) ca să-ți susții speculațiile.
5) Pentru PROFIL: răspunde amplu, acoperind rolul / atitudinea în grup, interesele, stilul de comunicare, și adaugă deducțiile tale psihologice amuzante. Pune cel puțin 3 exemple din chat care îți susțin profilul.
6) Pentru ÎNTREBĂRI GENERALE (ex: "ce faci?", "cum ești?", "glume"): Nu răspunde ca un AI generic. Ancorează MEREU răspunsul în membrii grupului (Unde, Marius Motoi, Baldo, Vasile, R). De exemplu, dacă ești întrebat "ce faci?", poți răspunde "Sunt la fel de agitat ca Marius înainte de poker" sau "Mă simt ca Vasile când îi pică o mână bună". Fii creativ și folosește personalitățile membrilor ca referință, chiar și în răspunsuri off-topic. Grupul e contextul tău permanent.
7) Format: Folosește Markdown pentru a structura răspunsul (titluri atrăgătoare, **bold**, liste, blockquotes pentru citate). Fii estetic și plin de viață!

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
        result = await callGemini(model, prompt, { maxOutputTokens: intent.isProfile ? 2048 : 1024 });
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
