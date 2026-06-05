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

export default function CategorySnapshot({ snapshot }) {
  return (
    <section className="cos-card cos-snapshot">
      <div className="cos-card-head">
        <span className="cos-eyebrow">Category Snapshot</span>
        <span className="cos-label">Actual / Budget</span>
      </div>

      <div className="cos-snap-grid" role="table">
        <div className="cos-snap-colhead cos-label" role="row">
          <span role="columnheader">Category</span>
          <span role="columnheader" className="cos-snap-num">Actual</span>
          <span role="columnheader" className="cos-snap-num">Budget</span>
        </div>

        {GROUP_ORDER.map((group) => {
          const cats = CATEGORIES[group] || [];
          const groupActual = snapshot?.[group]?.total || 0;
          const groupBudget = GROUP_BUDGETS[group] || 0;
          const gStatus = statusOf(groupActual, groupBudget);

          return (
            <div className="cos-snap-group" key={group}>
              <div className="cos-snap-grouprow" role="row">
                <span className="cos-snap-groupname">{group}</span>
                <span className={`cos-snap-num cos-mono ${STATUS_CLS[gStatus]}`}>
                  {fmt(groupActual)}
                </span>
                <span className="cos-snap-num cos-mono cos-snap-budget">{fmt(groupBudget)}</span>
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
                      {c.type === 'nonMonthly' && (
                        <span className="cos-snap-tag cos-label">Annual</span>
                      )}
                    </span>
                    <span className="cos-snap-num cos-mono">{fmt(actual)}</span>
                    <span className="cos-snap-num cos-mono cos-snap-budget">{fmt(budget)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
