import React, { useMemo, useState } from 'react';

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
