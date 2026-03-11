import React, { useMemo, useState } from 'react';

const PRESETS = [
  { id: 'rezumat-unde', label: 'Rezumat Unde', prompt: 'Fă un rezumat despre Unde (rol, stil de comunicare, teme recurente). Răspunde doar din conținut.' },
  { id: 'rezumat-marius', label: 'Rezumat Marius', prompt: 'Fă un rezumat despre Marius Motoi (rol, stil de comunicare, teme recurente). Răspunde doar din conținut.' },
  { id: 'rezumat-baldo', label: 'Rezumat Baldo', prompt: 'Fă un rezumat despre Baldo (rol, stil de comunicare, teme recurente). Răspunde doar din conținut.' },
  { id: 'rezumat-vasile', label: 'Rezumat Vasile', prompt: 'Fă un rezumat despre Vasile (rol, stil de comunicare, teme recurente). Răspunde doar din conținut.' },
  { id: 'rezumat-r', label: 'Rezumat R', prompt: 'Fă un rezumat despre R (rol, stil de comunicare, teme recurente). Răspunde doar din conținut.' },
  { id: 'glume-interne', label: 'Glume interne', prompt: 'Listează glumele interne și argoul explicate în conținut, cu scurtă descriere pentru fiecare.' },
  { id: 'teme-generale', label: 'Teme generale', prompt: 'Rezumatul subiectelor generale de conversație din conținut, pe scurt.' },
];

const AskAI = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handlePreset = async (prompt) => {
    setQuestion(prompt);
    await submitQuestion(prompt);
  };

  return (
    <div className="ask-ai">
      <h2>Întreabă AI-ul</h2>
      <div className="ask-presets">
        <p className="ask-presets-label">Preseturi rapide:</p>
        <div className="ask-presets-list">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="ask-preset"
              onClick={() => handlePreset(preset.prompt)}
              disabled={isLoading}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <form className="ask-ai-form" onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Scrie întrebarea aici..."
          rows={4}
        />
        <div className="ask-ai-actions">
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Se gândește...' : 'Întreabă'}
          </button>
          <button
            type="button"
            className="ask-ai-clear"
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

      {error && <p className="ask-error">{error}</p>}

      {answer && (
        <div className="ask-answer">
          <h3>Răspuns</h3>
          <p>{answer}</p>
          {sources.length > 0 && (
            <div className="ask-sources">
              <h4>Surse din conținut</h4>
              <ul>
                {sources.map((source, index) => (
                  <li key={`${source.id || index}`}>
                    {source.snippet || source}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AskAI;
