import { useRef, useState } from 'react';
import { GROUP_ORDER, CATEGORIES, GROUP_BUDGETS } from '../constants/categories.js';
import { effectiveBudget } from '../lib/budgetOverrides.js';

const fmt = (n) => '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
const fmtDate = (d) => {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return d; }
};

function statusOf(actual, budget) {
  if (budget <= 0) return 'ok';
  const r = actual / budget;
  if (r > 1.0) return 'over';
  if (r >= 0.9) return 'watch';
  return 'ok';
}

const BORDER_COLOR = { over: 'var(--alert)', watch: 'var(--warn)', ok: 'var(--ok)' };
const STATUS_CLS   = { over: 'is-alert',     watch: 'is-warn',     ok: 'is-ok' };
const TYPE_LABEL   = { fixed: 'Fixed', flexible: 'Flexible', nonMonthly: 'Non-Monthly' };

/**
 * Returns approximate number of months spanned by a date range.
 * Used to prorate monthly budgets for multi-month periods (YTD, Last Year, etc.).
 */
function monthsInRange(dateRange) {
  if (!dateRange?.min || !dateRange?.max) return 1;
  const msPerDay = 86_400_000;
  const days = Math.max(
    1,
    Math.round((new Date(dateRange.max + 'T00:00:00') - new Date(dateRange.min + 'T00:00:00')) / msPerDay) + 1,
  );
  return days / 30.44;
}

export default function CategorySnapshot({
  snapshot,
  transactions = [],
  budgetOverrides = {},
  onBudgetChange,
  onBudgetReset,
  dateRange,
  mode,
}) {
  const [collapsed, setCollapsed] = useState(
    () => Object.fromEntries(GROUP_ORDER.map((g) => [g, true])),
  );
  const [drilldown, setDrilldown] = useState(null); // 'Group/CatName'
  const [editing, setEditing] = useState(null);     // 'Group/CatName'
  const [draft, setDraft] = useState('');
  const editRef = useRef(null);

  const toggle = (group) => setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  const allCollapsed = GROUP_ORDER.every((g) => collapsed[g]);
  const toggleAll = () =>
    setCollapsed(Object.fromEntries(GROUP_ORDER.map((g) => [g, !allCollapsed])));

  const hasOverrides = Object.keys(budgetOverrides).length > 0;

  const isForecast = mode === 'forecast';
  // For forecast mode, compare projected values against full annual budget (multiplier=12).
  // Otherwise prorate by months in the displayed date range.
  const multiplier = isForecast ? 12 : monthsInRange(dateRange);
  const isMultiMonth = !isForecast && multiplier > 1.4;

  function startEdit(e, key, currentVal) {
    e.stopPropagation();
    setEditing(key);
    setDraft(String(Math.round(currentVal)));
    setTimeout(() => { editRef.current?.select(); }, 0);
  }

  function commitEdit() {
    if (!editing) return;
    const v = parseFloat(draft.replace(/[$,]/g, ''));
    if (!isNaN(v) && v >= 0) {
      const [group, ...rest] = editing.split('/');
      onBudgetChange?.(group, rest.join('/'), v);
    }
    setEditing(null);
  }

  function onEditKeyDown(e) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(null);
  }

  return (
    <section id="section-categories" className="cos-snapshot">
      <div className="cos-snapshot-header">
        <span className="cos-eyebrow">
          Category Snapshot
          {isForecast && <span className="cos-forecast-chip cos-label">EOY Forecast</span>}
        </span>
        <div className="cos-snap-header-right">
          {hasOverrides && (
            <button className="cos-snap-reset cos-label" onClick={onBudgetReset}>
              Reset to FY26
            </button>
          )}
          <button className="cos-snap-toggle-all cos-label" onClick={toggleAll}>
            {allCollapsed ? 'Expand All' : 'Collapse All'}
          </button>
          <span className="cos-label">
            {isForecast ? 'Projected EOY' : 'Actual'}&nbsp;/&nbsp;{isMultiMonth ? `Budget (${Math.round(multiplier)}mo)` : 'Annual Budget'}
          </span>
        </div>
      </div>

      <div className="cos-snap-groups">
        {GROUP_ORDER.map((group) => {
          const cats = CATEGORIES[group] || [];
          const groupActual = snapshot?.[group]?.total || 0;
          const groupBudget = GROUP_BUDGETS[group] || 0;
          const gStatus = statusOf(groupActual, groupBudget);
          const isCollapsed = collapsed[group] ?? false;

          return (
            <div className="cos-snap-group-card" key={group}>
              <button
                className="cos-snap-grouprow"
                onClick={() => toggle(group)}
                aria-expanded={!isCollapsed}
              >
                <span className={`cos-snap-chevron${isCollapsed ? '' : ' is-open'}`}>›</span>
                <span className="cos-snap-groupname">{group}</span>
                <span className={`cos-snap-num cos-mono ${STATUS_CLS[gStatus]}`}>
                  {fmt(groupActual)}
                </span>
                <span className="cos-snap-num cos-mono cos-snap-budget">{fmt(groupBudget)}</span>
              </button>

              {!isCollapsed && (
                <div className="cos-snap-cats">
                  <div className="cos-snap-colhead cos-label">
                    <span />
                    <span>Category</span>
                    <span className="cos-snap-num">{isForecast ? 'Projected' : 'Actual'}</span>
                    <span className="cos-snap-num">
                      {isMultiMonth ? `Budget (${Math.round(multiplier)}mo)` : 'Annual Budget'}
                    </span>
                  </div>

                  {cats.map((c) => {
                    const actual = snapshot?.[group]?.categories?.[c.name] || 0;
                    const baseBudget = effectiveBudget(group, c, budgetOverrides);
                    // nonMonthly: always compare against annual budget
                    // fixed/flexible: prorate monthly budget by number of months in view
                    const displayBudget = c.type === 'nonMonthly'
                      ? baseBudget
                      : baseBudget * multiplier;
                    const st = statusOf(actual, displayBudget);
                    const isOverridden = budgetOverrides[`${group}/${c.name}`] != null;
                    const ddKey = `${group}/${c.name}`;
                    const isDrillOpen = drilldown === ddKey;
                    const isEditingThis = editing === ddKey;

                    // Transactions for this category (from the period-filtered array).
                    const catTxs = transactions
                      .filter((tx) => tx.group === group && tx.category === c.name)
                      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

                    return (
                      <div key={c.name}>
                        {/* ── Category row ── */}
                        <div
                          className="cos-snap-row"
                          role="row"
                          style={{ borderTopColor: BORDER_COLOR[st] }}
                        >
                          {/* Drill-down toggle */}
                          <button
                            className={`cos-snap-drill-btn${isDrillOpen ? ' is-open' : ''}${catTxs.length === 0 ? ' is-empty' : ''}`}
                            onClick={() => setDrilldown(isDrillOpen ? null : ddKey)}
                            title={catTxs.length > 0 ? `${catTxs.length} transaction${catTxs.length > 1 ? 's' : ''}` : 'No transactions'}
                            disabled={catTxs.length === 0}
                          >
                            ›
                          </button>

                          {/* Category name + type tag */}
                          <span className="cos-snap-catname">
                            {c.name}
                            <span className="cos-snap-tag cos-label">{TYPE_LABEL[c.type]}</span>
                          </span>

                          {/* Actual */}
                          <span className="cos-snap-num cos-mono">{fmt(actual)}</span>

                          {/* Budget (click-to-edit) */}
                          <span
                            className={`cos-snap-num cos-snap-budget-cell${isOverridden ? ' is-overridden' : ''}`}
                            onClick={(e) => startEdit(e, ddKey, baseBudget)}
                            title={`Click to edit ${c.type === 'nonMonthly' ? 'annual' : 'monthly'} budget`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') startEdit(e, ddKey, baseBudget); }}
                          >
                            {isEditingThis ? (
                              <input
                                ref={editRef}
                                className="cos-budget-input cos-mono"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={onEditKeyDown}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <>
                                <span className={`cos-mono cos-snap-budget ${isOverridden ? 'is-overridden' : ''}`}>
                                  {fmt(displayBudget)}
                                </span>
                                {/* Non-monthly pacing: show remaining below the budget */}
                                {c.type === 'nonMonthly' && (
                                  <span className={`cos-snap-remaining cos-label ${baseBudget - actual < 0 ? 'is-alert' : ''}`}>
                                    {baseBudget - actual >= 0
                                      ? fmt(baseBudget - actual) + ' left'
                                      : fmt(actual - baseBudget) + ' over'}
                                  </span>
                                )}
                              </>
                            )}
                          </span>
                        </div>

                        {/* ── Drill-down transaction panel ── */}
                        {isDrillOpen && catTxs.length > 0 && (
                          <div className="cos-drill-panel">
                            {catTxs.map((tx, i) => (
                              <div key={i} className="cos-drill-row">
                                <span className="cos-drill-merchant">{tx.merchant || '—'}</span>
                                <span className="cos-label cos-drill-date">{fmtDate(tx.date)}</span>
                                <span className="cos-mono cos-drill-amt">{fmt(tx.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
