#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

const OUTPUT_PATH = path.resolve(process.cwd(), 'public', 'dashboard-stats.json');

const WEEKDAY_LABELS_RO = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));

const LEGACY = {
  period: {
    start: '2025-06-11',
    end: '2025-10-29',
    daysAnalyzed: 141,
  },
  authors: {
    Unde: 2961,
    'Marius Motoi': 2429,
    Baldo: 1164,
    Vasile: 705,
    R: 294,
  },
  weekdayCounts: [1085, 1072, 909, 1164, 910, 1138, 1283],
  peakHour: {
    hour: 20,
    label: '20:00 - 21:00',
    count: 704,
  },
  peakWeekday: {
    index: 6,
    label: 'Duminică',
    count: 1283,
  },
};

const CANONICAL_AUTHORS = Object.keys(LEGACY.authors);
const LEGACY_END_NUM = 20251029;
const INCREMENTAL_START_ISO = '2025-10-30';

const AUTHOR_ALIASES = {
  Robert: 'R',
};

const stripLeadingMarks = (value) =>
  String(value || '').replace(/^[\u200e\u200f\u202a-\u202e\u2066-\u2069]+/g, '');

const CHAT_LINE_RE =
  /^\[(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2}):(\d{2})\]\s(.*)$/;

const pad2 = (value) => String(value).padStart(2, '0');

const toIsoDate = ({ yyyy, mm, dd }) => `${String(yyyy).padStart(4, '0')}-${pad2(mm)}-${pad2(dd)}`;

const dateNum = ({ yyyy, mm, dd }) => yyyy * 10000 + mm * 100 + dd;

const weekdayIndexMondayFirst = ({ yyyy, mm, dd }) => {
  const utcDay = new Date(Date.UTC(yyyy, mm - 1, dd)).getUTCDay(); // 0=Sun .. 6=Sat
  return (utcDay + 6) % 7; // 0=Mon .. 6=Sun
};

const hourRangeLabel = (hour) => `${pad2(hour)}:00 - ${pad2((hour + 1) % 24)}:00`;

const normalizeAuthor = (author) => {
  const cleaned = stripLeadingMarks(String(author || '')).trim();
  if (!cleaned) {
    return null;
  }
  return AUTHOR_ALIASES[cleaned] || cleaned;
};

const parseChatLineStart = (line) => {
  const match = stripLeadingMarks(line).match(CHAT_LINE_RE);
  if (!match) {
    return null;
  }

  const [, dd, mm, yyyy, hh, min, ss, rest] = match;
  const dateParts = {
    dd: Number(dd),
    mm: Number(mm),
    yyyy: Number(yyyy),
    hh: Number(hh),
    min: Number(min),
    ss: Number(ss),
  };

  const separatorIndex = rest.indexOf(': ');
  const authorRaw = separatorIndex === -1 ? null : rest.slice(0, separatorIndex).trim();

  return {
    ...dateParts,
    authorRaw,
    isoDate: toIsoDate(dateParts),
    dateNum: dateNum(dateParts),
    sortKey: Date.UTC(dateParts.yyyy, dateParts.mm - 1, dateParts.dd, dateParts.hh, dateParts.min, dateParts.ss),
  };
};

const resolveInputPath = () => {
  const envPath = (process.env.CHAT_ARCHIVE_PATH || '').trim();
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }

  return path.resolve(process.cwd(), 'netlify', 'data', 'chat.txt');
};

const computeIncrementalStats = (transcript) => {
  const authors = Object.fromEntries(CANONICAL_AUTHORS.map((name) => [name, 0]));
  const hourCounts = Array(24).fill(0);
  const weekdayCounts = Array(7).fill(0);
  const uniqueDays = new Set();

  let totalMessages = 0;
  let ignoredMessages = 0;
  let maxSortKey = null;
  let endIso = INCREMENTAL_START_ISO;
  let transcriptMinSortKey = null;
  let transcriptMaxSortKey = null;
  let transcriptMinIso = null;
  let transcriptMaxIso = null;

  const lines = String(transcript || '').split(/\r?\n/);
  lines.forEach((rawLine) => {
    const start = parseChatLineStart(rawLine);
    if (!start) {
      return;
    }

    if (transcriptMinSortKey === null || start.sortKey < transcriptMinSortKey) {
      transcriptMinSortKey = start.sortKey;
      transcriptMinIso = start.isoDate;
    }
    if (transcriptMaxSortKey === null || start.sortKey > transcriptMaxSortKey) {
      transcriptMaxSortKey = start.sortKey;
      transcriptMaxIso = start.isoDate;
    }

    if (start.dateNum <= LEGACY_END_NUM) {
      return;
    }

    const author = normalizeAuthor(start.authorRaw);
    if (!author || !Object.prototype.hasOwnProperty.call(authors, author)) {
      ignoredMessages += 1;
      return;
    }

    authors[author] += 1;
    totalMessages += 1;
    uniqueDays.add(start.isoDate);
    hourCounts[start.hh] += 1;
    weekdayCounts[weekdayIndexMondayFirst(start)] += 1;

    if (maxSortKey === null || start.sortKey > maxSortKey) {
      maxSortKey = start.sortKey;
      endIso = start.isoDate;
    }
  });

  let peakHour = 0;
  let peakHourCount = 0;
  hourCounts.forEach((count, hour) => {
    if (count > peakHourCount) {
      peakHourCount = count;
      peakHour = hour;
    }
  });

  let peakWeekday = 0;
  let peakWeekdayCount = 0;
  weekdayCounts.forEach((count, index) => {
    if (count > peakWeekdayCount) {
      peakWeekdayCount = count;
      peakWeekday = index;
    }
  });

  return {
    period: {
      start: INCREMENTAL_START_ISO,
      end: endIso,
    },
    authors,
    totalMessages,
    daysAnalyzed: uniqueDays.size,
    hourCounts,
    weekdayCounts,
    peakHour: {
      hour: peakHour,
      label: hourRangeLabel(peakHour),
      count: peakHourCount,
    },
    peakWeekday: {
      index: peakWeekday,
      label: WEEKDAY_LABELS_RO[peakWeekday],
      count: peakWeekdayCount,
    },
    ignoredMessages,
    transcriptRange: transcriptMinIso && transcriptMaxIso ? { start: transcriptMinIso, end: transcriptMaxIso } : null,
  };
};

const computeCombinedStats = (incremental) => {
  const combinedAuthors = Object.fromEntries(
    CANONICAL_AUTHORS.map((name) => [name, (LEGACY.authors[name] || 0) + (incremental.authors[name] || 0)])
  );

  const combinedWeekdayCounts = LEGACY.weekdayCounts.map(
    (count, index) => count + (incremental.weekdayCounts[index] || 0)
  );

  let peakWeekday = 0;
  let peakWeekdayCount = 0;
  combinedWeekdayCounts.forEach((count, index) => {
    if (count > peakWeekdayCount) {
      peakWeekdayCount = count;
      peakWeekday = index;
    }
  });

  const totalMessages = Object.values(combinedAuthors).reduce((sum, value) => sum + value, 0);
  const daysAnalyzed = LEGACY.period.daysAnalyzed + incremental.daysAnalyzed;

  return {
    authors: combinedAuthors,
    totalMessages,
    daysAnalyzed,
    weekdayCounts: combinedWeekdayCounts,
    peakWeekday: {
      index: peakWeekday,
      label: WEEKDAY_LABELS_RO[peakWeekday],
      count: peakWeekdayCount,
    },
  };
};

const writeOutput = (payload) => {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`[dashboard-stats] Wrote ${OUTPUT_PATH}`);
};

const main = () => {
  const inputPath = resolveInputPath();
  let transcript = '';

  try {
    transcript = fs.readFileSync(inputPath, 'utf8');
  } catch (error) {
    console.warn(`[dashboard-stats] Missing transcript at ${inputPath}. Writing legacy-only stats.`);
  }

  const incremental = computeIncrementalStats(transcript);
  const combined = computeCombinedStats(incremental);

  const legacyTotalMessages = Object.values(LEGACY.authors).reduce((sum, value) => sum + value, 0);

  writeOutput({
    version: 1,
    generatedAt: new Date().toISOString(),
    labels: {
      authors: CANONICAL_AUTHORS,
      weekdays: WEEKDAY_LABELS_RO,
      hours: HOUR_LABELS,
    },
    legacy: {
      ...LEGACY,
      totalMessages: legacyTotalMessages,
    },
    incremental,
    combined,
  });
};

main();

