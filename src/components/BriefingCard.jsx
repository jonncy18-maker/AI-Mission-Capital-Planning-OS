import { tokenizeBriefing } from '../lib/anthropic.js';

const PERIOD_META = {
  month:     { label: 'This Month',      headline: 'The month' },
  rolling30: { label: 'Rolling 30',      headline: 'Rolling 30 days' },
  ytd:       { label: 'YTD',             headline: 'Year to date' },
  lastYear:  { label: 'Last Year',       headline: 'Last year' },
  custom:    { label: 'Custom',          headline: 'Custom period' },
  forecast:  { label: 'Forecast · EOY',  headline: 'EOY forecast' },
};

const FLAG_TEXT = { over: 'OVER', watch: 'WATCH', ok: 'OK' };
const FLAG_CLS  = { over: 'is-alert', watch: 'is-warn', ok: 'is-ok' };

function Flag({ level }) {
  return (
    <span className={`cos-flag ${FLAG_CLS[level]}`}>
      {FLAG_TEXT[level]}
    </span>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div className="cos-empty">
      <div className="cos-empty-mark">↥</div>
      <span className="cos-eyebrow">Awaiting data</span>
      <h2 className="cos-hero cos-empty-title">
        Upload a Monarch export to open the&nbsp;<em className="cos-italic">books.</em>
      </h2>
      <p className="cos-body cos-empty-body">
        Drop in a Monarch Money CSV and the OS will roll your categories up to
        groups, measure them against the FY26 plan, and draft an executive
        briefing. Nothing leaves your machine until you ask for the briefing.
      </p>
      <button type="button" className="cos-upload-btn cos-upload-btn--lg" onClick={onUpload}>
        Upload CSV
      </button>
    </div>
  );
}

export default function BriefingCard({ hasData, loading, error, briefing, period, onUpload }) {
  if (!hasData) {
    return (
      <section id="section-briefing" className="cos-card cos-briefing">
        <EmptyState onUpload={onUpload} />
      </section>
    );
  }

  const meta = PERIOD_META[period] || PERIOD_META.month;
  const periodLabel = meta.label;
  const headline = meta.headline;
  const tokens = briefing ? tokenizeBriefing(briefing) : [];

  return (
    <section id="section-briefing" className="cos-card cos-briefing">
      <div className="cos-card-head">
        <span className="cos-eyebrow">Executive Briefing</span>
        <span className="cos-label">{periodLabel}</span>
      </div>

      <h2 className="cos-hero cos-briefing-title">
        {headline},&nbsp;in&nbsp;<em className="cos-italic">brief.</em>
      </h2>

      {loading && <p className="cos-body cos-briefing-status">Drafting the briefing…</p>}
      {!loading && error && <p className="cos-body is-alert">{error}</p>}

      {!loading && !error && briefing && (
        <div className="cos-briefing-body cos-body">
          {tokens.map((t, i) =>
            t.type === 'flag' ? <Flag key={i} level={t.level} /> : <span key={i}>{t.value}</span>
          )}
        </div>
      )}

      {!loading && !error && !briefing && (
        <p className="cos-body cos-briefing-status">
          Briefing will appear after data loads. Add VITE_ANTHROPIC_KEY to .env to enable.
        </p>
      )}
    </section>
  );
}
