#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

const CHAT_CHUNK_TARGET_CHARS = 1600;
const OUTPUT_PATH = path.resolve(process.cwd(), 'netlify', 'data', 'chat.index.json');

const STOPWORDS = new Set([
  'si', 'sau', 'iar', 'dar', 'de', 'din', 'la', 'cu', 'pe', 'in', 'este', 'sunt', 'o', 'un', 'una',
  'ce', 'cine', 'cand', 'cum', 'care', 'cat', 'cata', 'cati', 'cate', 'despre',
  'zic', 'zice', 'zici', 'zis', 'spun', 'spune', 'spui', 'spus',
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'for', 'on', 'in', 'is', 'are', 'was', 'were', 'it', 'this',
  'http', 'https', 'www', 'com', 'ro',
]);

const normalizeText = (text) =>
  String(text || '')
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
  return raw.replace(/\s*[\u200e\u200f]?\b(image|audio|video|sticker)\s+omitted\b/gi, '').trim();
};

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
    if (!message) {
      return;
    }

    const entryText = cleanChatMessageText(message.text);
    if (!entryText) {
      return;
    }

    const header = message.author ? `[${message.timestamp}] ${message.author}: ` : `[${message.timestamp}] `;
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

const resolveInputPath = () => {
  const envPath = (process.env.CHAT_ARCHIVE_PATH || '').trim();
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }

  return path.resolve(process.cwd(), 'netlify', 'data', 'chat.txt');
};

const main = () => {
  const inputPath = resolveInputPath();

  let transcript = '';
  try {
    transcript = fs.readFileSync(inputPath, 'utf8');
  } catch (error) {
    console.warn(`[chat-index] Missing transcript at ${inputPath}. Writing empty index.`);
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify(
        {
          version: 1,
          generatedAt: new Date().toISOString(),
          chunkTargetChars: CHAT_CHUNK_TARGET_CHARS,
          docCount: 0,
          chunks: [],
          df: {},
        },
        null,
        2
      ) + '\n',
      'utf8'
    );
    return;
  }

  const messages = parseWhatsAppTranscript(transcript);
  const chunks = buildChatChunks(messages);

  const df = new Map();
  chunks.forEach((chunk) => {
    const uniqueTokens = new Set(tokenize(chunk.text));
    uniqueTokens.forEach((token) => {
      df.set(token, (df.get(token) || 0) + 1);
    });
  });

  const dfObject = Object.create(null);
  df.forEach((value, key) => {
    dfObject[key] = value;
  });

  // --- Pre-computed author profiles (inductive approach) ---
  const authorProfiles = buildAuthorProfiles(messages);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        chunkTargetChars: CHAT_CHUNK_TARGET_CHARS,
        docCount: chunks.length,
        chunks,
        df: dfObject,
        authorProfiles,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  console.log(`[chat-index] Wrote ${chunks.length} chunks + ${Object.keys(authorProfiles).length} author profiles to ${OUTPUT_PATH}`);
};

// ---------------------------------------------------------------
// Inductive author profiling — computed at build time, injected
// at query time for profile questions. Avoids relying solely on
// live TF-IDF retrieval which is too sparse for personality inference.
// ---------------------------------------------------------------

const PROFILE_STOPWORDS = new Set([
  'si', 'sau', 'iar', 'dar', 'de', 'din', 'la', 'cu', 'pe', 'in', 'este', 'sunt',
  'o', 'un', 'una', 'ce', 'cine', 'cand', 'cum', 'care', 'ok', 'da', 'nu', 'aha',
  'hai', 'haha', 'lol', 'mm', 'aa', 'ah', 'oh', 'oo', 'oi',
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'for', 'on', 'in', 'is',
  'are', 'was', 'were', 'it', 'this', 'that', 'http', 'https', 'www', 'com', 'ro',
  'sticker', 'omitted', 'image', 'audio', 'video',
]);

const TOP_NGRAM_COUNT = 15;
const EXAMPLE_MESSAGE_COUNT = 6;
const EXAMPLE_MESSAGE_MIN_CHARS = 30;
const EXAMPLE_MESSAGE_MAX_CHARS = 200;

const getNgrams = (tokens, n) => {
  const result = [];
  for (let i = 0; i <= tokens.length - n; i += 1) {
    result.push(tokens.slice(i, i + n).join(' '));
  }
  return result;
};

const countFreq = (items) => {
  const freq = new Map();
  items.forEach((item) => {
    freq.set(item, (freq.get(item) || 0) + 1);
  });
  return freq;
};

const topN = (freq, n, minCount = 2) =>
  Array.from(freq.entries())
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term, count]) => ({ term, count }));

const buildAuthorProfiles = (messages) => {
  const byAuthor = new Map();

  messages.forEach((msg) => {
    if (!msg.author || !msg.text) return;
    const cleaned = msg.text
      .replace(/\s*[\u200e\u200f]?\b(image|audio|video|sticker)\s+omitted\b/gi, '')
      .trim();
    if (!cleaned) return;

    if (!byAuthor.has(msg.author)) {
      byAuthor.set(msg.author, { messages: [], hourCounts: new Array(24).fill(0), dayCounts: new Array(7).fill(0) });
    }
    const entry = byAuthor.get(msg.author);
    entry.messages.push({ text: cleaned, timestamp: msg.timestamp });

    // Parse hour and weekday from timestamp "DD.MM.YYYY HH:MM:SS"
    const parts = msg.timestamp.match(/(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/);
    if (parts) {
      const [, dd, mm, yyyy, hh] = parts;
      entry.hourCounts[parseInt(hh, 10)] += 1;
      const date = new Date(`${yyyy}-${mm}-${dd}`);
      entry.dayCounts[date.getDay()] += 1; // 0=Sun
    }
  });

  const DAYS = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
  const profiles = Object.create(null);

  byAuthor.forEach((data, author) => {
    const { messages: authorMsgs, hourCounts, dayCounts } = data;
    const totalMsgs = authorMsgs.length;

    // Token & bigram frequency (excluding stopwords)
    const allTokens = [];
    const allBigrams = [];
    authorMsgs.forEach(({ text }) => {
      const tokens = normalizeText(text)
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .filter((t) => t.length >= 3 && !PROFILE_STOPWORDS.has(t));
      allTokens.push(...tokens);
      allBigrams.push(...getNgrams(tokens, 2));
    });

    const tokenFreq = countFreq(allTokens);
    // Filter bigrams that contain year tokens (photo filenames noise: "photo 2026", "2026 jpg")
    const cleanBigrams = allBigrams.filter((bg) => !/\b(20\d\d|jpg|jpeg|png|mp4|opus|webp)\b/.test(bg));
    const bigramFreq = countFreq(cleanBigrams);
    const topTokens = topN(tokenFreq, TOP_NGRAM_COUNT, 3);
    const topBigrams = topN(bigramFreq, 8, 2);

    // Message length distribution
    const lengths = authorMsgs.map(({ text }) => text.length);
    const avgLen = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
    const shortPct = Math.round((lengths.filter((l) => l < 20).length / (lengths.length || 1)) * 100);
    const longPct = Math.round((lengths.filter((l) => l > 150).length / (lengths.length || 1)) * 100);

    // Peak activity hour
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    // Peak weekday
    const peakDay = dayCounts.indexOf(Math.max(...dayCounts));

    // Question rate (messages ending in ?)
    const questionCount = authorMsgs.filter(({ text }) => text.trim().endsWith('?')).length;
    const questionPct = Math.round((questionCount / (totalMsgs || 1)) * 100);

    // Link sharing
    const linkCount = authorMsgs.filter(({ text }) => /https?:\/\//i.test(text)).length;

    // Diverse representative examples: pick from thirds (early/mid/recent)
    const pickExample = (msgs) => {
      for (let i = msgs.length - 1; i >= 0; i -= 1) {
        const t = msgs[i].text;
        if (t.length >= EXAMPLE_MESSAGE_MIN_CHARS && !/https?:\/\//i.test(t)) {
          return t.length > EXAMPLE_MESSAGE_MAX_CHARS ? t.slice(0, EXAMPLE_MESSAGE_MAX_CHARS - 1) + '…' : t;
        }
      }
      return null;
    };
    const third = Math.ceil(authorMsgs.length / 3);
    const examples = [
      pickExample(authorMsgs.slice(third * 2)),      // recent
      pickExample(authorMsgs.slice(third, third * 2)), // mid
      pickExample(authorMsgs.slice(0, third)),        // early
    ].filter(Boolean).slice(0, EXAMPLE_MESSAGE_COUNT);

    profiles[author] = {
      totalMessages: totalMsgs,
      avgMessageLength: Math.round(avgLen),
      shortMessagePct: shortPct,
      longMessagePct: longPct,
      peakHour,
      peakDayLabel: DAYS[peakDay] || '?',
      questionPct,
      linkCount,
      topWords: topTokens,
      topPhrases: topBigrams,
      exampleMessages: examples,
    };
  });

  return profiles;
};

main();
