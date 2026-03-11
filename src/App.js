import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { marked } from 'marked'; // Import marked

// Import chart components (these are still imported but not rendered in App.js directly)
import MessageCountChart from './components/MessageCountChart';
import HourlyActivityChart from './components/HourlyActivityChart';
import DailyActivityChart from './components/DailyActivityChart';
import AskAI from './components/AskAI';

const KNOWLEDGE_PATH = `${process.env.PUBLIC_URL || ''}/knowledge.md`;
const TOTAL_MESSAGES = 2961 + 2429 + 1164 + 705 + 294;
const STATS = [
  { label: 'Total mesaje', value: TOTAL_MESSAGES },
  { label: 'Zile analizate', value: '141' },
  { label: 'Vârf orar', value: '20:00 - 21:00' },
  { label: 'Zi de vârf', value: 'Duminică' },
];
const FILTERS = [
  'Unde',
  'Marius Motoi',
  'Baldo',
  'Vasile',
  'R',
  'Poker',
  'Glume interne',
  'Planuri',
  'Tehnologie',
];

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
        <AskAI />
        <div className="status-strip">
          {STATS.map((item) => (
            <div key={item.label} className="status-item">
              <div className="status-value">{item.value}</div>
              <div className="status-label">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="filter-strip">
          {FILTERS.map((filter) => (
            <span key={filter} className="filter-pill">
              {filter}
            </span>
          ))}
        </div>
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
        <span className="cursor">_</span> {/* Blinking cursor */}
      </div>
    </div>
  );
}

export default App;
