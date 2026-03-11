# Chat Analyzer Dashboard

Dashboard + Q&A (Gemini) peste:
- un rezumat static: `public/knowledge.md`
- o arhiva conversationala WhatsApp: `netlify/data/chat.txt`

Q&A ruleaza printr-o functie Netlify (`netlify/functions/ask.js`) care selecteaza fragmente relevante din continut si le trimite ca `CONTEXT` catre Gemini.

## Setup

Recomandat: Node 20 (vezi `.nvmrc`).

Instalare dependinte:

```bash
nvm use
npm install
```

Variabile de mediu:

- `GEMINI_API_KEY` (obligatoriu pentru Q&A)
- optional `GEMINI_MODELS` (ex: `gemini-2.5-flash,gemini-2.5-flash-lite`)
- optional `CHAT_ARCHIVE_PATH` (cale catre transcript; implicit foloseste `netlify/data/chat.txt`)

## Arhiva WhatsApp

- transcriptul folosit de serverless: `netlify/data/chat.txt`
- index prebuild (optional, recomandat): `netlify/data/chat.index.json`
- generator index: `scripts/build-chat-index.js` (rulat automat la `npm run build`)

Nota: nu pune transcriptul in `public/` (ar deveni public).

## Rulare local

UI:

```bash
npm start
```

UI + functii Netlify (recomandat, ca sa mearga `/.netlify/functions/ask`):

```bash
npx netlify dev
```

## Deploy (Netlify)

`netlify.toml` include in bundle fisierele:
- `public/knowledge.md`
- `netlify/data/chat.txt`
- `netlify/data/chat.index.json`
