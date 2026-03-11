import React, { useMemo, useState } from 'react';
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
    description: 'Rol, stil, interese',
    prompt: 'Descrie profilul lui Unde (rol în grup, stil de comunicare, subiecte recurente) și dă 3 exemple cu timestamp.',
    gradient: ['#6366F1', '#8B5CF6'],
  },
  {
    id: 'profile-marius',
    label: 'Marius',
    description: 'Umor, povești, energie',
    prompt:
      'Ce poți deduce despre Marius Motoi (rol în grup, tip de umor, teme recurente)? Dă 3 exemple cu timestamp și o observație din statistici.',
    gradient: ['#EC4899', '#6366F1'],
  },
  {
    id: 'profile-baldo',
    label: 'Baldo',
    description: 'Sarcasm, observații',
    prompt:
      'Ce poți spune despre Baldo (stil, replici memorabile, subiecte recurente)? Dă 3 exemple cu timestamp și explică ce nu se poate concluziona sigur.',
    gradient: ['#8B5CF6', '#EC4899'],
  },
  {
    id: 'profile-vasile',
    label: 'Vasile',
    description: 'Atitudine, preferințe',
    prompt:
      'Descrie profilul lui Vasile (rol, stil, ce îl preocupă/ce îl enervează în discuții) și dă 3 exemple cu timestamp. Include și o observație din statistici.',
    gradient: ['#6366F1', '#EC4899'],
  },
  {
    id: 'profile-r',
    label: 'R',
    description: 'Tehnic, “vocea rațiunii”',
    prompt:
      'Ce poți deduce despre R/Robert (rol tehnic, tip de ajutor oferit, stil de comunicare)? Dă 3 exemple cu timestamp și menționează ce indică statisticile.',
    gradient: ['#22C55E', '#8B5CF6'],
  }
];

const AskAI = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [model, setModel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedSources = useMemo(() => normalizeSources(sources), [sources]);

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

    setIsLoading(true);
    setError('');
    setAnswer('');
    setSources([]);
    setModel('');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload.error || `Request failed (${response.status})`;
        throw new Error(message);
      }

      const payload = await response.json();
      setAnswer(payload.answer || '');
      setSources(Array.isArray(payload.sources) ? payload.sources : []);
      setModel(payload.model || '');
    } catch (err) {
      setError(err.message || 'A apărut o eroare.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitQuestion(question);
  };


  return (
    <div className="ask-ai-centered">
      
      {/* Centered Hero Header */}
      <div className="ask-hero-header">
        <div className="ask-hero-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <h2 className="ask-hero-title">Insight-uri din Chat</h2>
        <p className="ask-hero-subtitle">
          Pe baza istoricului de conversații, AI-ul nostru extrage statistici, momente amuzante și creează profile detaliate.
        </p>
      </div>

      {/* Pill Input */}
      <form className="ask-hero-form" onSubmit={handleSubmit}>
        <div className="ask-input-pill">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Întreabă despre un membru, cine domină discuția sau trenduri..."
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

      {/* Suggestions Grid */}
      <div className="ask-hero-suggestions">
        <div className="ask-suggestions-grid-centered">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="ask-suggestion-card-pill"
              disabled={isLoading}
              onClick={() => {
                setQuestion(suggestion.prompt);
                submitQuestion(suggestion.prompt);
              }}
            >
              <span
                className="ask-suggestion-icon-circle"
                style={{
                  color: suggestion.gradient?.[0] || '#6366F1',
                  background: `rgba(${parseInt(suggestion.gradient?.[0].slice(1,3), 16) || 99}, ${parseInt(suggestion.gradient?.[0].slice(3,5), 16) || 102}, ${parseInt(suggestion.gradient?.[0].slice(5,7), 16) || 241}, 0.15)`
                }}
              >
                {suggestion.label.slice(0, 1)}
              </span>
              <span className="ask-suggestion-text-single">
                {suggestion.label} {suggestion.description ? `- ${suggestion.description}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {answer && (
        <div className="ask-answer-centered">
          <div className="ask-answer-header">
            <span className="ask-answer-label">Răspuns</span>
            {model && <span className="ask-model-badge">{model.replace('gemini-', 'Gemini ')}</span>}
          </div>
          <div
            className="ask-answer-text"
            dangerouslySetInnerHTML={{ __html: answerHtml }}
          />
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
          <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: '20px', display: 'block', width: 'fit-content', marginLeft: 'auto', marginRight: 'auto' }}
              onClick={() => {
                setQuestion('');
                setAnswer('');
                setSources([]);
                setError('');
              }}
            >
              Închide și curăță
          </button>
        </div>
      )}
    </div>
  );
};

export default AskAI;
