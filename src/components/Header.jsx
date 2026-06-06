import { useEffect, useRef } from 'react';

const PERIODS = [
  { key: 'month',     label: 'This Month' },
  { key: 'rolling30', label: 'Rolling 30' },
  { key: 'ytd',       label: 'YTD' },
  { key: 'lastYear',  label: 'Last Year' },
  { key: 'custom',    label: 'Custom',       phase5: true },
  { key: 'forecast',  label: 'Forecast · EOY', phase5: true },
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
  triggerUpload,
  lastUpdated,
  actualsThrough,
}) {
  const headerRef = useRef(null);
  const s = STATUS[status] || STATUS.ontrack;

  // Keep --header-h in sync with actual header height for sidebar sticky offset.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () =>
      document.documentElement.style.setProperty('--header-h', el.offsetHeight + 'px');
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header id="cos-header" ref={headerRef} className="cos-header">
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
            onClick={triggerUpload}
          >
            {hasData ? 'Replace CSV' : 'Upload CSV'}
          </button>
        </div>
      </div>

      <div className="cos-period-row">
        <nav className={`cos-period-tabs ${hasData ? '' : 'is-disabled'}`}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={!hasData || p.phase5}
              title={p.phase5 ? 'Coming in a future update' : undefined}
              className={`cos-period-tab ${period === p.key ? 'is-active' : ''} ${p.phase5 ? 'is-phase5' : ''}`}
              onClick={() => !p.phase5 && onPeriod(p.key)}
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
