import { useEffect, useMemo, useRef, useState } from 'react';
import './tokens.css';
import './app.css';

import Header from './components/Header.jsx';
import BriefingCard from './components/BriefingCard.jsx';
import CategorySnapshot from './components/CategorySnapshot.jsx';
import Sidebar from './components/Sidebar.jsx';
import TrendSection from './components/TrendSection.jsx';

import { parseMonarchCsv } from './lib/csvParser.js';
import { filterByPeriod, aggregateTransactions } from './lib/periodFilter.js';
import { loadOverrides, saveOverrides, resetOverrides } from './lib/budgetOverrides.js';
import { loadHistory, upsertMonth } from './lib/history.js';
import { generateBriefing } from './lib/anthropic.js';
import { syncToSheets } from './lib/sheets.js';
import { GROUP_ORDER, CATEGORIES, GROUP_BUDGETS, MISSION_CAPITAL } from './constants/categories.js';

const FOOTER_SECTIONS = {
  Briefing:   'section-briefing',
  Categories: 'section-categories',
  Mission:    'section-mission',
  Settings:   'cos-header',
};
const STORAGE_KEY = 'cos_session_v1';

const UNFILTERED_PERIODS = new Set(['custom', 'forecast']);

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
  const [budgetOverrides, setBudgetOverrides] = useState(() => loadOverrides());
  const [history, setHistory] = useState(() => loadHistory());

  const fileInputRef = useRef(null);
  const triggerUpload = () => fileInputRef.current?.click();

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

      // Persist this month to history (keyed by YYYY-MM of dateRange.max).
      const updatedHistory = upsertMonth(result);
      setHistory(updatedHistory);

      if (result.dateRange?.max) {
        setActualsThrough(formatDate(result.dateRange.max));
      }

      const ts = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      setLastUpdated(ts);

      const webhookUrl = import.meta.env.VITE_SHEETS_WEBHOOK_URL;
      if (webhookUrl) syncToSheets(csvText, webhookUrl).catch(() => {});

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

      try {
        const text = await generateBriefing({ period, snapshot, totals });
        setBriefing(text);
        saveSession(result, text, result.dateRange?.max ? formatDate(result.dateRange.max) : null, ts);
      } catch (briefErr) {
        setBriefing('');
        setError(briefErr.message);
        saveSession(result, '', result.dateRange?.max ? formatDate(result.dateRange.max) : null, ts);
      }
    } catch (err) {
      setError(err.message || 'Could not parse that file.');
      setParsed(null);
    } finally {
      setLoading(false);
    }
  }

  // Filtered view: re-aggregate transactions for the active period.
  const filteredData = useMemo(() => {
    if (!parsed) return null;
    if (!parsed.transactions || UNFILTERED_PERIODS.has(period)) {
      return { ...parsed, filteredTransactions: parsed.transactions ?? [] };
    }
    const txs = filterByPeriod(parsed.transactions, period, parsed.dateRange?.max);
    return {
      ...aggregateTransactions(txs),
      transactions: parsed.transactions,        // full set — kept for session storage
      filteredTransactions: txs,                // period slice — used by drill-down
      excluded: parsed.excluded,
    };
  }, [parsed, period]);

  const summary = useMemo(() => {
    if (!filteredData) return null;
    const groups = filteredData.groups;
    const actual = Object.values(groups).reduce((s, g) => s + g.total, 0);
    const budget = GROUP_ORDER.reduce((s, g) => s + (GROUP_BUDGETS[g] || 0), 0);
    return {
      actual,
      budget,
      transactionCount: filteredData.transactionCount,
      groupCount: Object.keys(groups).length,
    };
  }, [filteredData]);

  const missionSpent = useMemo(() => {
    if (!filteredData) return null;
    const educationActual =
      (filteredData.groups['Education']?.total || 0) +
      (filteredData.groups['Gifts & Donations']?.categories?.['Philippine Transfers'] || 0);
    return {
      education: educationActual,
      family: filteredData.netflixSplit.family,
      nextgen: filteredData.netflixSplit.nextgen,
    };
  }, [filteredData]);

  const status = useMemo(() => {
    if (!summary) return 'ontrack';
    const r = summary.actual / summary.budget;
    if (r > 1.0) return 'alert';
    if (r >= 0.92) return 'watch';
    return 'ontrack';
  }, [summary]);

  function handleBudgetChange(group, catName, value) {
    const next = { ...budgetOverrides, [`${group}/${catName}`]: value };
    setBudgetOverrides(next);
    saveOverrides(next);
  }

  function handleBudgetReset() {
    setBudgetOverrides({});
    resetOverrides();
  }

  function handleFooterNav(item) {
    setActiveNav(item);
    const id = FOOTER_SECTIONS[item];
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div id="cosRoot" className={dark ? 'dark' : ''}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = '';
        }}
      />

      <div className={`cos-shell ${isMobile ? 'is-mobile' : ''}`}>
        <Header
          hasData={hasData}
          period={period}
          onPeriod={setPeriod}
          status={status}
          dark={dark}
          onToggleTheme={() => setDark((d) => !d)}
          triggerUpload={triggerUpload}
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
              onUpload={triggerUpload}
            />
            {hasData && (
              <CategorySnapshot
                snapshot={filteredData.groups}
                transactions={filteredData.filteredTransactions}
                budgetOverrides={budgetOverrides}
                onBudgetChange={handleBudgetChange}
                onBudgetReset={handleBudgetReset}
                dateRange={filteredData.dateRange}
              />
            )}
            {hasData && <TrendSection history={history} />}
          </div>

          <Sidebar
            hasData={hasData}
            summary={summary}
            missionSpent={missionSpent}
          />
        </main>

        <footer className="cos-footer">
          <nav className="cos-footer-nav">
            {Object.keys(FOOTER_SECTIONS).map((item) => (
              <button
                key={item}
                type="button"
                className={`cos-footer-link ${activeNav === item ? 'is-active' : ''}`}
                onClick={() => handleFooterNav(item)}
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
