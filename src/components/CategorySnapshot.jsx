import { useState } from 'react';
import { GROUP_ORDER, CATEGORIES, GROUP_BUDGETS } from '../constants/categories.js';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');

function statusOf(actual, budget) {
  if (budget <= 0) return 'ok';
  const r = actual / budget;
  if (r > 1.0)  return 'over';
  if (r >= 0.9) return 'watch';
  return 'ok';
}

const BORDER = { over: 'var(--alert)', watch: 'var(--warn)', ok: 'var(--ok)' };
const STATUS_CLS = { over: 'is-alert', watch: 'is-warn', ok: 'is-ok' };
const TYPE_LABEL = { fixed: 'Fixed', flexible: 'Flexible', nonMonthly: 'Non-Monthly' };

export default function CategorySnapshot({ snapshot }) {
  const [collapsed, setCollapsed] = useState(
    () => Object.fromEntries(GROUP_ORDER.map((g) => [g, true]))
  );

  const toggle = (group) =>
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));

  const allCollapsed = GROUP_ORDER.every((g) => collapsed[g]);
  const toggleAll = () =>
    setCollapsed(Object.fromEntries(GROUP_ORDER.map((g) => [g, !allCollapsed])));

  return (
    <section id="section-categories" className="cos-snapshot">
      <div className="cos-snapshot-header">
        <span className="cos-eyebrow">Category Snapshot</span>
        <div className="cos-snap-header-right">
          <button className="cos-snap-toggle-all cos-label" onClick={toggleAll}>
            {allCollapsed ? 'Expand All' : 'Collapse All'}
          </button>
          <span className="cos-label">Actual / Budget</span>
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
                    <span>Category</span>
                    <span className="cos-snap-num">Actual</span>
                    <span className="cos-snap-num">Budget</span>
                  </div>
                  {cats.map((c) => {
                    const actual = snapshot?.[group]?.categories?.[c.name] || 0;
                    const budget = c.type === 'nonMonthly' ? c.annual : (c.monthly || 0);
                    const st = statusOf(actual, budget);
                    return (
                      <div
                        className="cos-snap-row"
                        role="row"
                        key={c.name}
                        style={{ borderTopColor: BORDER[st] }}
                      >
                        <span className="cos-snap-catname">
                          {c.name}
                          <span className="cos-snap-tag cos-label">{TYPE_LABEL[c.type]}</span>
                        </span>
                        <span className="cos-snap-num cos-mono">{fmt(actual)}</span>
                        <span className="cos-snap-num cos-mono cos-snap-budget">{fmt(budget)}</span>
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
