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

  const coverageLabel = useMemo(() => {
    const legacy = dashboardStats?.legacy?.period;
    const incremental = dashboardStats?.incremental?.period;
    if (!legacy?.start || !legacy?.end || !incremental?.start || !incremental?.end) {
      return '';
    }

    return `Legacy: ${formatRoDate(legacy.start)} – ${formatRoDate(legacy.end)} • Noi: ${formatRoDate(
      incremental.start
    )} – ${formatRoDate(incremental.end)}`;
  }, [dashboardStats]);

  return (
    <div className="App">
      <div className="bento-grid">
        
        {/* Header Section */}
        <div className="bento-header header-section">
          <h1 className="title">Chat Analyzer Dashboard</h1>
          <p className="subtitle">Insights și analize avansate despre conversații</p>
          {coverageLabel && <p className="meta">{coverageLabel}</p>}
          {statsError && !coverageLabel && <p className="meta meta-error">Stats indisponibile: {statsError}</p>}
        </div>

        {/* Filters Strip */}
        <div className="bento-filters filter-strip">
          {FILTERS.map((filter) => (
            <span key={filter} className="filter-pill">
              {filter}
            </span>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bento-stats status-grid">
          {statsCards.map((item) => (
            <div key={item.label} className="status-item bento-card">
              <div className="status-label">{item.label}</div>
              <div className="status-value">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Ask AI Section (Moved to the top) */}
        <div className="bento-ask-ai bento-card">
          <div className="bento-inner">
            <AskAI />
          </div>
        </div>

        {/* Charts Section */}
        <div className="bento-chart-main bento-card">
          <div className="bento-inner chart-container">
            <MessageCountChart stats={dashboardStats} />
          </div>
        </div>

        <div className="bento-chart-secondary bento-card">
          <div className="bento-inner chart-container">
            <DailyActivityChart stats={dashboardStats} />
          </div>
        </div>

        <div className="bento-chart-tertiary bento-card">
          <div className="bento-inner chart-container">
            <HourlyActivityChart stats={dashboardStats} />
          </div>
        </div>

        {/* Knowledge Base Section */}
        <div className="bento-knowledge bento-card knowledge-section">
          <div className="bento-inner knowledge-content">
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
    </div>
  );
}

export default App;
