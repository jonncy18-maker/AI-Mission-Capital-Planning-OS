import { GROUP_ORDER, GROUP_BUDGETS } from '../constants/categories.js';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');

function fmtMonthKey(key) {
  try {
    return new Date(key + '-01T00:00:00').toLocaleDateString('en-US', {
      month: 'short', year: '2-digit',
    });
  } catch { return key; }
}

function statusCls(actual, monthlyBudget) {
  if (monthlyBudget <= 0) return 'is-ok';
  const r = actual / monthlyBudget;
  if (r > 1.0) return 'is-alert';
  if (r >= 0.9) return 'is-warn';
  return 'is-ok';
}

/**
 * Month-over-month trend table. Shown only when history has 2+ months.
 * Each cell is a mini progress bar (actual vs monthly budget) + dollar amount.
 */
export default function TrendSection({ history }) {
  const allKeys = Object.keys(history).sort();
  if (allKeys.length < 2) return null;

  const months = allKeys.slice(-6); // cap at 6 columns

  return (
    <section className="cos-trend">
      <div className="cos-snapshot-header">
        <span className="cos-eyebrow">Month-over-Month</span>
        <span className="cos-label">{months.length} months</span>
      </div>

      <div className="cos-trend-scroll">
        <table className="cos-trend-table">
          <thead>
            <tr>
              <th className="cos-trend-group-th cos-label">Group</th>
              {months.map((m) => (
                <th key={m} className="cos-trend-month-th cos-label">{fmtMonthKey(m)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUP_ORDER.map((group) => {
              const annualBudget = GROUP_BUDGETS[group] || 0;
              const monthlyBudget = annualBudget / 12;
              return (
                <tr key={group} className="cos-trend-row">
                  <td className="cos-trend-group-td">{group}</td>
                  {months.map((m) => {
                    const actual = history[m]?.groups?.[group]?.total || 0;
                    const pct = monthlyBudget > 0
                      ? Math.min(100, Math.round((actual / monthlyBudget) * 100))
                      : 0;
                    const cls = statusCls(actual, monthlyBudget);
                    return (
                      <td key={m} className="cos-trend-cell">
                        <div className="cos-trend-bar">
                          <div className={`cos-trend-fill ${cls}`} style={{ width: pct + '%' }} />
                        </div>
                        <span className={`cos-mono cos-trend-amt ${cls}`}>{fmt(actual)}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
