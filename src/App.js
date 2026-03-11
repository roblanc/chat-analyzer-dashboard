import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { marked } from 'marked';

import MessageCountChart from './components/MessageCountChart';
import HourlyActivityChart from './components/HourlyActivityChart';
import DailyActivityChart from './components/DailyActivityChart';
import AskAI from './components/AskAI';

const KNOWLEDGE_PATH = `${process.env.PUBLIC_URL || ''}/knowledge.md`;
const DASHBOARD_STATS_PATH = `${process.env.PUBLIC_URL || ''}/dashboard-stats.json`;

const FALLBACK_TOTAL_MESSAGES = 2961 + 2429 + 1164 + 705 + 294;
const FALLBACK_DAYS_ANALYZED = 141;
const FALLBACK_PEAK_HOUR = '20:00 - 21:00';
const FALLBACK_PEAK_DAY = 'Duminică';

const RO_MONTHS_SHORT = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const formatRoDate = (isoDate) => {
  const [yyyy, mm, dd] = String(isoDate || '').split('-').map((value) => Number(value));
  if (!yyyy || !mm || !dd) {
    return String(isoDate || '').trim();
  }
  return `${dd} ${RO_MONTHS_SHORT[mm - 1]} ${yyyy}`;
};


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

  const htmlContent = useMemo(
    () => marked.parse(markdownContent || ''), 
    [markdownContent]
  );

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



  return (
    <div className="App">
      <div className="ai-chat-layout">
        
        {/* Header Section */}
        <div className="bento-header header-section">
          <h1 className="title">Prietenii <span className="title-highlight">GPT</span></h1>
          <p className="subtitle">Asistentul inteligent pentru grupul tău de prieteni</p>
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
          <h2 style={{marginTop: 0, marginBottom: '24px', color: 'var(--text)'}}>Bază de Cunoștințe</h2>
          {loadError ? (
            <p className="load-error">
              Nu am putut încărca conținutul: {loadError}
            </p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          )}
        </div>

      </div>
    </div>
  );
}

export default App;
