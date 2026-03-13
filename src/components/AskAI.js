import React, { useMemo, useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  breaks: true,
  headerIds: false,
  mangle: false,
});

const SOURCE_META = {
  knowledge: { label: 'Rezumat', className: 'ask-source-pill--knowledge' },
  stats: { label: 'Statistici', className: 'ask-source-pill--stats' },
  authorProfile: { label: 'Profil inductiv', className: 'ask-source-pill--profile' },
  examples: { label: 'Exemple', className: 'ask-source-pill--examples' },
};

const normalizeSources = (rawSources) => {
  if (!Array.isArray(rawSources)) {
    return [];
  }

  return rawSources
    .map((source, index) => {
      if (!source) {
        return null;
      }

      if (typeof source === 'string') {
        return {
          kind: 'chat',
          id: `legacy-${index}`,
          snippet: source,
        };
      }

      return source;
    })
    .filter(Boolean);
};

const getSourceLabel = (source) => {
  const meta = SOURCE_META[source.kind] || null;
  const snippet = String(source.snippet || '').trim();

  if (source.kind === 'knowledge') {
    const cleaned = snippet.replace(/^##\s*/, '').trim();
    return cleaned || meta?.label || 'Rezumat';
  }

  return meta?.label || snippet || source.kind || 'Sursa';
};

const PROMPT_SUGGESTIONS = [
  {
    id: 'profile-unde',
    label: 'Unde',
    description: 'Alexandru Nae',
    prompt: 'Descrie profilul lui Alexandru Nae (Unde) - rol în grup, stil de comunicare, subiecte recurente și dă 3 exemple cu timestamp.',
    avatar: '/avatars/Unde.PNG',
  },
  {
    id: 'profile-marius',
    label: 'Marius',
    description: 'Motoi',
    prompt:
      'Ce poți deduce despre Marius Motoi (rol în grup, tip de umor, teme recurente)? Dă 3 exemple cu timestamp și o observație din statistici.',
    avatar: '/avatars/Marius Motoi.PNG',
  },
  {
    id: 'profile-baldo',
    label: 'Baldo',
    description: 'Virgil Baldovin',
    prompt:
      'Ce poți spune despre Virgil Baldovin (Baldo) - stil, replici memorabile, subiecte recurente și dă 3 exemple cu timestamp.',
    avatar: '/avatars/Baldo.PNG',
  },
  {
    id: 'profile-vasile',
    label: 'Vasile',
    description: 'Vasile Cristian (tobosar)',
    prompt:
      'Descrie profilul lui Vasile Cristian (tobosar) - rol, stil, ce îl preocupă în discuții și dă 3 exemple cu timestamp.',
    avatar: '/avatars/Vasile.PNG',
  },
  {
    id: 'profile-r',
    label: 'R',
    description: 'Robert, “vocea rațiunii”',
    prompt:
      'Ce poți deduce despre Robert (R) - rol tehnic, tip de ajutor oferit, stil de comunicare și dă 3 exemple cu timestamp.',
    avatar: '/avatars/Robert.PNG',
  }
];

const FUNNY_LOADING_MESSAGES = [
  { emoji: '🚿', text: 'Vasile se spală pe cap, revenim imediat...' },
  { emoji: '💩', text: 'Unde e la baie, așteptăm și noi...' },
  { emoji: '🔧', text: 'R repară calculatorul cuiva (din nou)...' },
  { emoji: '🍕', text: 'Baldo comandă pizza și uită să răspundă...' },
  { emoji: '💤', text: 'Vasile a adormit pe tastatură, îl trezim...' },
  { emoji: '📱', text: 'Unde trimite 47 de linkuri simultan...' },
  { emoji: '🎭', text: 'Marius exagerează dramatic răspunsul...' },
  { emoji: '🐌', text: 'R explică tehnic de ce durează atât...' },
  { emoji: '🫠', text: 'Baldo e sarcastic și nu ajută deloc...' },
  { emoji: '🎰', text: 'Consultăm oracolul de poker pentru inspirație...' },
  { emoji: '🌙', text: 'Toți sunt pe Discord la 2 noaptea, nu răspund...' },
];

const AskAI = () => {
  const [question, setQuestion] = useState('');
  const [askedQuestion, setAskedQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  // Conversation history: max 3 turns kept in state, sent with each request
  const [conversationHistory, setConversationHistory] = useState([]);

  const normalizedSources = useMemo(() => normalizeSources(sources), [sources]);

  useEffect(() => {
    if (!isLoading) return;
    setLoadingMsgIdx(0);
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % FUNNY_LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

  const answerHtml = useMemo(() => {
    if (!answer) {
      return '';
    }

    const rawHtml = marked.parse(answer);
    return DOMPurify.sanitize(rawHtml, {
      FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'img', 'svg', 'math'],
      FORBID_ATTR: ['style'],
    });
  }, [answer]);

  const endpoint = useMemo(
    () => process.env.REACT_APP_ASK_ENDPOINT || '/.netlify/functions/ask',
    []
  );

  const submitQuestion = async (input) => {
    const trimmed = input.trim();

    if (!trimmed || isLoading) {
      return;
    }

    setQuestion('');
    setAskedQuestion(trimmed);
    setIsLoading(true);
    setError('');
    setAnswer('');
    setSources([]);

    // Save to Netlify Forms for private auditing
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        "form-name": "ai-questions",
        "question": trimmed
      }).toString()
    }).catch(e => console.error('[FORM_ERROR]', e.message));

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: trimmed, history: conversationHistory }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload.error || `Request failed (${response.status})`;
        throw new Error(message);
      }

      const payload = await response.json();
      const newAnswer = payload.answer || '';
      setAnswer(newAnswer);
      setSources(Array.isArray(payload.sources) ? payload.sources : []);
      // Append to history (keep last 3 turns)
      if (newAnswer) {
        setConversationHistory((prev) =>
          [...prev, { q: trimmed, a: newAnswer }].slice(-3)
        );
      }
    } catch (err) {
      setError(err.message || 'A apărut o eroare.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy = `Întrebare: ${askedQuestion}\n\nPrietenii GPT: ${answer}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Prietenii GPT - Conversație',
      text: `Vezi ce am vorbit cu Prietenii GPT!\n\nÎntrebare: ${askedQuestion}\n\nRezumat: ${answer.slice(0, 100)}...`,
      url: window.location.href
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await handleCopy();
        alert('Link-ul și textul au fost copiate în clipboard!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitQuestion(question);
  };


  return (
    <div className="ask-ai-centered">
      


      {/* Pill Input */}
      <form className="ask-hero-form" onSubmit={handleSubmit}>
        <div className="ask-input-pill" data-empty={!question}>
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder=""
            disabled={isLoading}
          />
          <button type="submit" className="ask-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="ask-spinner"></span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
        {error && <div className="ask-error-inline">{error}</div>}
      </form>

      {/* Funny Loading Animation */}
      {isLoading && (
        <div className="ask-funny-loading">
          <div className="ask-funny-emoji" key={`emoji-${loadingMsgIdx}`}>
            {FUNNY_LOADING_MESSAGES[loadingMsgIdx].emoji}
          </div>
          <div className="ask-funny-text" key={`text-${loadingMsgIdx}`}>
            {FUNNY_LOADING_MESSAGES[loadingMsgIdx].text}
          </div>
          <div className="ask-funny-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}


      {answer && (
        <div className="ask-answer-centered">
          {askedQuestion && (
            <div className="ask-question-context">
              <span className="ask-question-label">Întrebarea ta</span>
              <p className="ask-question-text">{askedQuestion}</p>
            </div>
          )}
          <div className="ask-answer-header">
            <span className="ask-answer-label">Răspuns</span>
          </div>
          <div
            className="ask-answer-text"
            dangerouslySetInnerHTML={{ __html: answerHtml }}
          />

          {/* Action Buttons */}
          <div className="ask-actions-bar">
            <button 
              type="button" 
              className={`ask-action-btn ${isCopied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {isCopied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Copiat!
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy
                </>
              )}
            </button>
            <button type="button" className="ask-action-btn" onClick={handleShare}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              Share
            </button>
          </div>
          {normalizedSources.length > 0 && (
            <div className="ask-sources">
              <span className="ask-sources-label">Surse</span>
              <div className="ask-sources-pills">
                {normalizedSources
                  .filter((s) => s.kind !== 'chat')
                  .map((source, index) => {
                    const meta = SOURCE_META[source.kind] || null;
                    const label = getSourceLabel(source);
                    return (
                      <span
                        key={`${source.kind}-${source.id ?? index}`}
                        className={['ask-source-pill', meta?.className].filter(Boolean).join(' ')}
                      >
                        {label}
                      </span>
                    );
                  })}
                {normalizedSources.filter((s) => s.kind === 'chat').length > 0 && (
                  <span className="ask-source-pill ask-source-pill--chat">
                    Chat: {normalizedSources.filter((s) => s.kind === 'chat').length} fragmente
                  </span>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
            {conversationHistory.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-violet, #a78bfa)', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
                <span>🔗</span>
                <span>{conversationHistory.length} {conversationHistory.length === 1 ? 'schimb' : 'schimburi'} în conversație</span>
              </div>
            )}
            <button
              type="button"
              className="btn-secondary"
              style={{ display: 'block', width: 'fit-content' }}
              onClick={() => {
                setQuestion('');
                setAskedQuestion('');
                setAnswer('');
                setSources([]);
                setError('');
                setConversationHistory([]);
              }}
            >
              Conversație nouă
            </button>
          </div>
        </div>
      )}

      {/* Suggested Quick Prompts — always visible */}
      <div className="ask-quick-prompts">
        <button type="button" onClick={() => { setQuestion("Cine e cel mai haios din grup?"); submitQuestion("Cine e cel mai haios din grup?"); }} disabled={isLoading}>Cine e cel mai haios? 😂</button>
        <button type="button" onClick={() => { setQuestion("Rezumatul general al discuțiilor"); submitQuestion("Rezumatul general al discuțiilor"); }} disabled={isLoading}>Rezumat discuții 📝</button>
        <button type="button" onClick={() => { setQuestion("Cine întârzie de obicei la poker?"); submitQuestion("Cine întârzie de obicei la poker?"); }} disabled={isLoading}>Cine întârzie la poker? 🃏</button>
      </div>

      {/* Member Cards — always visible */}
      <div className="ask-hero-suggestions">
        <div className="ask-member-grid">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="ask-member-card"
              disabled={isLoading}
              onClick={() => {
                setQuestion(suggestion.prompt);
                submitQuestion(suggestion.prompt);
              }}
            >
              <img
                src={`${process.env.PUBLIC_URL || ''}${suggestion.avatar}`}
                alt={`${suggestion.label} avatar`}
                className="ask-member-avatar"
              />
              <span className="ask-member-name">{suggestion.label}</span>
              {suggestion.description && (
                <span className="ask-member-desc">{suggestion.description}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AskAI;
