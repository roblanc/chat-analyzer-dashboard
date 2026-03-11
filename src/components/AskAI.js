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
    label: 'Profil: Unde',
    description: 'Rol, stil, interese',
    prompt: 'Descrie profilul lui Unde (rol în grup, stil de comunicare, subiecte recurente) și dă 3 exemple cu timestamp.',
    gradient: ['#6366F1', '#8B5CF6'],
  },
  {
    id: 'profile-marius',
    label: 'Profil: Marius',
    description: 'Umor, povești, energie',
    prompt:
      'Ce poți deduce despre Marius Motoi (rol în grup, tip de umor, teme recurente)? Dă 3 exemple cu timestamp și o observație din statistici.',
    gradient: ['#EC4899', '#6366F1'],
  },
  {
    id: 'profile-baldo',
    label: 'Profil: Baldo',
    description: 'Sarcasm, observații',
    prompt:
      'Ce poți spune despre Baldo (stil, replici memorabile, subiecte recurente)? Dă 3 exemple cu timestamp și explică ce nu se poate concluziona sigur.',
    gradient: ['#8B5CF6', '#EC4899'],
  },
  {
    id: 'profile-vasile',
    label: 'Profil: Vasile',
    description: 'Atitudine, preferințe',
    prompt:
      'Descrie profilul lui Vasile (rol, stil, ce îl preocupă/ce îl enervează în discuții) și dă 3 exemple cu timestamp. Include și o observație din statistici.',
    gradient: ['#6366F1', '#EC4899'],
  },
  {
    id: 'profile-r',
    label: 'Profil: R',
    description: 'Tehnic, “vocea rațiunii”',
    prompt:
      'Ce poți deduce despre R/Robert (rol tehnic, tip de ajutor oferit, stil de comunicare)? Dă 3 exemple cu timestamp și menționează ce indică statisticile.',
    gradient: ['#22C55E', '#8B5CF6'],
  },
  {
    id: 'compare',
    label: 'Comparație',
    description: 'Cine domină discuția?',
    prompt:
      'Fă o comparație între Unde, Marius Motoi, Baldo, Vasile și R: cine pare să conducă discuțiile și de ce? Dă dovezi din statistici + 3 exemple cu timestamp.',
    gradient: ['#EC4899', '#22C55E'],
  },
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
    <div className="ask-ai">
      <div className="ask-header">
        <div className="ask-ai-icon" title="AI Assistant">
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ padding: '4px' }}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <h2 style={{ margin: 0 }}>Asistent AI</h2>
      </div>
      <form className="ask-ai-form" onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Pune o întrebare despre aceste conversații..."
          rows={4}
        />
        <div className="ask-ai-actions">
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Analizează...' : 'Întreabă'}
          </button>
          <button
            type="button"
            className="btn-secondary ask-ai-clear"
            onClick={() => {
              setQuestion('');
              setAnswer('');
              setSources([]);
              setError('');
            }}
            disabled={isLoading}
          >
            Curăță
          </button>
        </div>
      </form>

      <div className="ask-suggestions">
        <div className="ask-suggestions-title">Întrebări sugerate</div>
        <div className="ask-suggestions-grid">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="ask-suggestion-card"
              disabled={isLoading}
              onClick={() => {
                setQuestion(suggestion.prompt);
                submitQuestion(suggestion.prompt);
              }}
            >
              <span
                className="ask-suggestion-icon"
                style={{
                  '--from': suggestion.gradient?.[0] || '#6366F1',
                  '--to': suggestion.gradient?.[1] || '#EC4899',
                }}
              >
                {suggestion.label.slice(0, 1)}
              </span>
              <span className="ask-suggestion-text">
                <span className="ask-suggestion-label">{suggestion.label}</span>
                <span className="ask-suggestion-desc">{suggestion.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="ask-error">{error}</p>}

      {answer && (
        <div className="ask-answer">
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
        </div>
      )}
    </div>
  );
};

export default AskAI;
