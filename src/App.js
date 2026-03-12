import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

import MessageCountChart from './components/MessageCountChart';
import HourlyActivityChart from './components/HourlyActivityChart';
import DailyActivityChart from './components/DailyActivityChart';
import AskAI from './components/AskAI';
import KnowledgeBase from './components/KnowledgeBase';

const KNOWLEDGE_PATH = `${process.env.PUBLIC_URL || ''}/knowledge.md`;
const DASHBOARD_STATS_PATH = `${process.env.PUBLIC_URL || ''}/dashboard-stats.json`;

const FALLBACK_TOTAL_MESSAGES = 2961 + 2429 + 1164 + 705 + 294;
const FALLBACK_DAYS_ANALYZED = 141;
const FALLBACK_PEAK_HOUR = '20:00 - 21:00';
const FALLBACK_PEAK_DAY = 'Duminică';


function App() {
  const [markdownContent, setMarkdownContent] = useState('');
  const [loadError, setLoadError] = useState('');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsError, setStatsError] = useState('');

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

  useEffect(() => {
    let isMounted = true;

    fetch(DASHBOARD_STATS_PATH)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load stats (${response.status})`);
        }
        return response.json();
      })
      .then((payload) => {
        if (isMounted) {
          setDashboardStats(payload);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setStatsError(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const statsCards = useMemo(() => {
    const combined = dashboardStats?.combined;
    const incremental = dashboardStats?.incremental;

    const totalMessages = combined?.totalMessages ?? FALLBACK_TOTAL_MESSAGES;
    const daysAnalyzed = combined?.daysAnalyzed ?? FALLBACK_DAYS_ANALYZED;
    const newMessages = incremental?.totalMessages;
    const peakHour = incremental?.peakHour?.label ?? FALLBACK_PEAK_HOUR;
    const peakDay = combined?.peakWeekday?.label ?? FALLBACK_PEAK_DAY;

    return [
      { label: 'Total mesaje', value: Number(totalMessages).toLocaleString('ro-RO') },
      { label: 'Mesaje noi', value: typeof newMessages === 'number' ? newMessages.toLocaleString('ro-RO') : '—' },
      { label: 'Zile analizate', value: Number(daysAnalyzed).toLocaleString('ro-RO') },
      { label: 'Vârf orar (noi)', value: peakHour },
      { label: 'Zi de vârf', value: peakDay },
    ];
  }, [dashboardStats]);


  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="App">
      <div className="ai-chat-layout">
        
        {/* Header Section */}
        <div className="bento-header header-section">
          <div className="header-top-row">
            <h1
              className="title title-home-link"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Prietenii <span className="title-highlight">GPT</span>
            </h1>
            
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'light' ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>
          </div>


          {statsError && <p className="meta meta-error">Stats indisponibile: {statsError}</p>}
        </div>

        {/* Filters Strip (Removed as decided in plan to rely on suggestions directly) */}

        {/* Ask AI Hero Section (Primary Focus) */}
        <div className="ai-chat-hero">
          <AskAI />
        </div>

        {/* Seamless Stats (Inline under AI) */}
        <div className="stats-inline-strip">
          {statsCards.map((item) => (
            <span key={item.label} className="stats-inline-item">
              <span className="stats-inline-value">{item.value}</span>
              <span className="stats-inline-label">{item.label}</span>
            </span>
          ))}
        </div>

        {/* Charts Section (Fluid, no cards) */}
        <div className="fluid-chart-main">
          <MessageCountChart stats={dashboardStats} />
        </div>

        <div className="fluid-chart-secondary">
          <DailyActivityChart stats={dashboardStats} />
        </div>

        <div className="fluid-chart-tertiary">
          <HourlyActivityChart stats={dashboardStats} />
        </div>

        {/* Knowledge Base Section */}
        <div className="fluid-knowledge-section">
          <div className="kb-section-header">
            <span className="kb-section-title">Bază de Cunoștințe</span>
          </div>
          {loadError ? (
            <p className="load-error">Nu am putut încărca conținutul: {loadError}</p>
          ) : (
            <KnowledgeBase markdown={markdownContent} />
          )}
        </div>

      </div>
    </div>
  );
}

export default App;
