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
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  console.log(`[chat-index] Wrote ${chunks.length} chunks to ${OUTPUT_PATH}`);
};

main();
