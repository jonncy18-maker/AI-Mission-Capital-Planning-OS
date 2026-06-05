import { useRef } from 'react';

const PERIODS = [
  { key: 'month',     label: 'This Month' },
  { key: 'rolling30', label: 'Rolling 30' },
  { key: 'ytd',       label: 'YTD' },
  { key: 'lastYear',  label: 'Last Year' },
  { key: 'custom',    label: 'Custom' },
  { key: 'forecast',  label: 'Forecast · EOY' },
];

const STATUS = {
  ontrack: { label: 'On Track', cls: 'is-ok' },
  watch:   { label: 'Watch',    cls: 'is-warn' },
  alert:   { label: 'Alert',    cls: 'is-alert' },
};

export default function Header({
  hasData,
  period,
  onPeriod,
  status,
  dark,
  onToggleTheme,
  onUpload,
  lastUpdated,
  actualsThrough,
}) {
  const fileRef = useRef(null);
  const s = STATUS[status] || STATUS.ontrack;

  return (
    <header className="cos-header">
      <div className="cos-header-row">
        <div className="cos-wordmark">
          <span className="cos-wordmark-mark">CP</span>
          <span className="cos-wordmark-text">Capital&nbsp;Planning&nbsp;<em className="cos-italic">OS</em></span>
        </div>

        <div className="cos-header-tools">
          {hasData && (
            <span className={`cos-status-pill ${s.cls}`}>
              <span className="cos-status-dot" />
              {s.label}
            </span>
          )}

          <button
            type="button"
            className="cos-theme-toggle"
            onClick={onToggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? '☼' : '☾'}
          </button>

          <button
            type="button"
            className="cos-upload-btn"
            onClick={() => fileRef.current && fileRef.current.click()}
          >
            {hasData ? 'Replace CSV' : 'Upload CSV'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="cos-period-row">
        <nav className={`cos-period-tabs ${hasData ? '' : 'is-disabled'}`}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={!hasData}
              className={`cos-period-tab ${period === p.key ? 'is-active' : ''}`}
              onClick={() => onPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </nav>
        <span className="cos-updated cos-label">
          {actualsThrough
            ? `Actuals through ${actualsThrough}`
            : lastUpdated
            ? `Updated ${lastUpdated}`
            : 'No data loaded'}
        </span>
      </div>
    </header>
  );
}
