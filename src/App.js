import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { marked } from 'marked'; // Import marked

// Import chart components (these are still imported but not rendered in App.js directly)
import MessageCountChart from './components/MessageCountChart';
import HourlyActivityChart from './components/HourlyActivityChart';
import DailyActivityChart from './components/DailyActivityChart';
import AskAI from './components/AskAI';

const KNOWLEDGE_PATH = `${process.env.PUBLIC_URL || ''}/knowledge.md`;

function App() {
  const [markdownContent, setMarkdownContent] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    fetch(KNOWLEDGE_PATH)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load knowledge (${response.status})`);
        }
        return response.text();
      })
      .then((text) => {
        if (isMounted) {
          setMarkdownContent(text);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const htmlContent = useMemo(
    () => marked.parse(markdownContent || ''), 
    [markdownContent]
  );

  return (
    <div className="App">
      <div className="terminal-output">
        {loadError ? (
          <p className="load-error">
            Nu am putut încărca conținutul: {loadError}
          </p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        )}
        <div className="charts-container">
          <div className="chart-item">
            <MessageCountChart />
          </div>
          <div className="chart-item">
            <HourlyActivityChart />
          </div>
          <div className="chart-item">
            <DailyActivityChart />
          </div>
        </div>
        <AskAI />
        <span className="cursor">_</span> {/* Blinking cursor */}
      </div>
    </div>
  );
}

export default App;
