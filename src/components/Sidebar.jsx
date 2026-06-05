import { MISSION_CAPITAL } from '../constants/categories.js';
import ScenarioStub from './ScenarioStub.jsx';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');

function SummaryRow({ k, v, accent }) {
  return (
    <div className="cos-sum-row">
      <span className="cos-label">{k}</span>
      <span className={`cos-mono cos-sum-val ${accent ? 'cos-sum-accent' : ''}`}>{v}</span>
    </div>
  );
}

function MissionBar({ item, spent }) {
  const pct = item.annual > 0 ? Math.min(100, Math.round((spent / item.annual) * 100)) : 0;
  return (
    <div className="cos-mission-item">
      <div className="cos-mission-top">
        <span className="cos-mission-label">{item.label}</span>
        <span className="cos-mono cos-mission-pct">{pct}%</span>
      </div>
      <div className="cos-bar">
        <div className="cos-bar-fill" style={{ width: pct + '%' }} />
      </div>
      <div className="cos-mission-foot">
        <span className="cos-label">{item.note}</span>
        <span className="cos-mono cos-mission-amt">{fmt(spent)} / {fmt(item.annual)}</span>
      </div>
    </div>
  );
}

export default function Sidebar({ hasData, summary, missionSpent }) {
  return (
    <aside className={`cos-sidebar ${hasData ? '' : 'is-placeholder'}`}>
      <section className="cos-side-block">
        <span className="cos-eyebrow">Period Summary</span>
        <div className="cos-sum-list">
          {hasData ? (
            <>
              <SummaryRow k="Total Spent" v={fmt(summary.actual)} accent />
              <SummaryRow k="Budgeted" v={fmt(summary.budget)} />
              <SummaryRow
                k="Variance"
                v={(summary.actual <= summary.budget ? '−' : '+') + fmt(Math.abs(summary.budget - summary.actual))}
              />
              <SummaryRow k="Transactions" v={String(summary.transactionCount)} />
              <SummaryRow k="Groups" v={String(summary.groupCount)} />
            </>
          ) : (
            ['Total Spent', 'Budgeted', 'Variance', 'Transactions', 'Groups'].map((k) => (
              <div className="cos-sum-row" key={k}>
                <span className="cos-label">{k}</span>
                <span className="cos-ph-bar" />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="cos-side-block">
        <span className="cos-eyebrow">Mission Capital</span>
        <div className="cos-mission-list">
          {MISSION_CAPITAL.map((item) =>
            hasData ? (
              <MissionBar key={item.key} item={item} spent={missionSpent?.[item.key] ?? 0} />
            ) : (
              <div className="cos-mission-item" key={item.key}>
                <div className="cos-mission-top">
                  <span className="cos-mission-label cos-ph-text">{item.label}</span>
                </div>
                <div className="cos-bar">
                  <div className="cos-bar-fill" style={{ width: '0%' }} />
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <ScenarioStub />
    </aside>
  );
}
