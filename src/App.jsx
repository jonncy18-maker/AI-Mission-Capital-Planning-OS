import { useEffect, useMemo, useState } from 'react';
import './tokens.css';
import './app.css';

import Header from './components/Header.jsx';
import BriefingCard from './components/BriefingCard.jsx';
import CategorySnapshot from './components/CategorySnapshot.jsx';
import Sidebar from './components/Sidebar.jsx';

import { parseMonarchCsv } from './lib/csvParser.js';
import { generateBriefing } from './lib/anthropic.js';
import { syncToSheets } from './lib/sheets.js';
import { GROUP_ORDER, CATEGORIES, GROUP_BUDGETS, MISSION_CAPITAL } from './constants/categories.js';

const FOOTER_NAV = ['Briefing', 'Categories', 'Mission', 'Settings'];
const STORAGE_KEY = 'cos_session_v1';

function saveSession(parsed, briefing, actualsThrough, lastUpdated) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ parsed, briefing, actualsThrough, lastUpdated }));
  } catch {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(file);
  });
}

function formatDate(isoDate) {
  try {
    return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [period, setPeriod] = useState('month');
  const [parsed, setParsed] = useState(() => loadSession()?.parsed ?? null);
  const [briefing, setBriefing] = useState(() => loadSession()?.briefing ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(() => loadSession()?.lastUpdated ?? null);
  const [actualsThrough, setActualsThrough] = useState(() => loadSession()?.actualsThrough ?? null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeNav, setActiveNav] = useState('Briefing');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const hasData = !!parsed;

  async function handleUpload(file) {
    setError('');
    setLoading(true);
    setBriefing('');
    try {
      const csvText = await readFileAsText(file);
      const result = parseMonarchCsv(csvText);
      setParsed(result);

      // Actuals-through date from the last transaction in the CSV
      if (result.dateRange?.max) {
        const through = formatDate(result.dateRange.max);
        setActualsThrough(through);
      }

      setLastUpdated(
        new Date().toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        })
      );

      // Sync raw CSV rows to Google Sheets (non-blocking, silent fail)
      const webhookUrl = import.meta.env.VITE_SHEETS_WEBHOOK_URL;
      if (webhookUrl) {
        syncToSheets(csvText, webhookUrl).catch(() => {});
      }

      // Build the snapshot payload the briefing call needs.
      const snapshot = GROUP_ORDER.map((g) => {
        const groupData = result.groups[g] || { total: 0, categories: {} };
        return {
          group: g,
          actual: groupData.total,
          budget: GROUP_BUDGETS[g] || 0,
          categories: (CATEGORIES[g] || []).map((c) => ({
            name: c.name,
            type: c.type,
            actual: groupData.categories[c.name] || 0,
            budget: c.type === 'nonMonthly' ? c.annual : (c.monthly || 0),
          })),
        };
      });

      const totals = {
        actual: Object.values(result.groups).reduce((s, g) => s + g.total, 0),
        budget: GROUP_ORDER.reduce((s, g) => s + (GROUP_BUDGETS[g] || 0), 0),
      };

      const ts = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });

      try {
        const text = await generateBriefing({ period, snapshot, totals });
        setBriefing(text);
        saveSession(result, text, result.dateRange?.max ? formatDate(result.dateRange.max) : null, ts);
      } catch (briefErr) {
        setBriefing('');
        setError(briefErr.message);
        // Still persist parsed data even if briefing generation failed
        saveSession(result, '', result.dateRange?.max ? formatDate(result.dateRange.max) : null, ts);
      }
    } catch (err) {
      setError(err.message || 'Could not parse that file.');
      setParsed(null);
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    if (!parsed) return null;
    const groups = parsed.groups;
    const actual = Object.values(groups).reduce((s, g) => s + g.total, 0);
    const budget = GROUP_ORDER.reduce((s, g) => s + (GROUP_BUDGETS[g] || 0), 0);
    return {
      actual,
      budget,
      transactionCount: parsed.transactionCount,
      groupCount: Object.keys(groups).length,
    };
  }, [parsed]);

  // Derive Mission Capital spent from parsed data.
  const missionSpent = useMemo(() => {
    if (!parsed) return null;
    const educationActual =
      (parsed.groups['Education']?.total || 0) +
      (parsed.groups['Gifts & Donations']?.categories?.['Philippine Transfers'] || 0);
    return {
      education: educationActual,
      family: parsed.netflixSplit.family,
      nextgen: parsed.netflixSplit.nextgen,
    };
  }, [parsed]);

  const status = useMemo(() => {
    if (!summary) return 'ontrack';
    const r = summary.actual / summary.budget;
    if (r > 1.0) return 'alert';
    if (r >= 0.92) return 'watch';
    return 'ontrack';
  }, [summary]);

  return (
    <div id="cosRoot" className={dark ? 'dark' : ''}>
      <div className={`cos-shell ${isMobile ? 'is-mobile' : ''}`}>
        <Header
          hasData={hasData}
          period={period}
          onPeriod={setPeriod}
          status={status}
          dark={dark}
          onToggleTheme={() => setDark((d) => !d)}
          onUpload={handleUpload}
          lastUpdated={lastUpdated}
          actualsThrough={actualsThrough}
        />

        <main className="cos-main">
          <div className="cos-main-col">
            <BriefingCard
              hasData={hasData}
              loading={loading}
              error={error}
              briefing={briefing}
              period={period}
              onUpload={() => document.querySelector('input[type=file]')?.click()}
            />
            {hasData && <CategorySnapshot snapshot={parsed.groups} />}
          </div>

          <Sidebar
            hasData={hasData}
            summary={summary}
            missionSpent={missionSpent}
          />
        </main>

        <footer className="cos-footer">
          <nav className="cos-footer-nav">
            {FOOTER_NAV.map((item) => (
              <button
                key={item}
                type="button"
                className={`cos-footer-link ${activeNav === item ? 'is-active' : ''}`}
                onClick={() => setActiveNav(item)}
              >
                {item}
              </button>
            ))}
          </nav>
          <span className="cos-footer-mark cos-label">Capital Planning OS</span>
        </footer>
      </div>
    </div>
  );
}
