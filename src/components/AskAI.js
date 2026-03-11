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
      <h2>Întreabă AI-ul</h2>
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
