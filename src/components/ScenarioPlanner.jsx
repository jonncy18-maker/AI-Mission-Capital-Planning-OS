import { useState } from 'react';
import { GROUP_ORDER, CATEGORIES } from '../constants/categories.js';

const fmt = (n) => {
  const sign = n >= 0 ? '+' : '−';
  return sign + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
};

export default function ScenarioPlanner({ adjustments, hasData, onAdd, onRemove, onClear }) {
  const [selectedKey, setSelectedKey] = useState('');
  const [delta, setDelta] = useState('');

  function handleAdd() {
    const d = parseFloat(delta);
    if (!selectedKey || isNaN(d) || d === 0) return;
    onAdd(selectedKey, d);
    setDelta('');
    setSelectedKey('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd();
  }

  const adjEntries = Object.entries(adjustments);
  const totalDelta = adjEntries.reduce((s, [, d]) => s + d, 0);

  return (
    <section className="cos-side-block cos-scenario">
      <div className="cos-scenario-head">
        <span className="cos-eyebrow">Scenarios</span>
        {adjEntries.length > 0 && (
          <button type="button" className="cos-scenario-clear cos-label" onClick={onClear}>
            Clear All
          </button>
        )}
      </div>

      {!hasData ? (
        <>
          <p className="cos-body cos-scenario-body">
            Model raises, big purchases, and mission commitments against the plan —
            and see the briefing rewrite itself.
          </p>
          <div className="cos-scenario-ghost">
            <span className="cos-ph-bar" style={{ width: '70%' }} />
            <span className="cos-ph-bar" style={{ width: '45%' }} />
            <span className="cos-ph-bar" style={{ width: '60%' }} />
          </div>
        </>
      ) : (
        <>
          <p className="cos-body cos-scenario-body">
            Adjust any category to see the impact on totals and Mission Capital.
          </p>

          <div className="cos-scenario-add">
            <select
              className="cos-scenario-select"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
            >
              <option value="">Select category…</option>
              {GROUP_ORDER.map((g) => (
                <optgroup key={g} label={g}>
                  {CATEGORIES[g].map((c) => (
                    <option key={c.name} value={`${g}/${c.name}`}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="cos-scenario-input-row">
              <input
                type="number"
                className="cos-scenario-delta"
                placeholder="±$"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                className="cos-scenario-add-btn"
                onClick={handleAdd}
                disabled={!selectedKey || delta === '' || delta === '0'}
              >
                Add
              </button>
            </div>
          </div>

          {adjEntries.length > 0 && (
            <div className="cos-scenario-list">
              {adjEntries.map(([key, d]) => {
                const [group, ...rest] = key.split('/');
                const catName = rest.join('/');
                return (
                  <div key={key} className="cos-scenario-item">
                    <div className="cos-scenario-item-label">
                      <span className="cos-scenario-group cos-label">{group}</span>
                      <span className="cos-scenario-cat">{catName}</span>
                    </div>
                    <span className={`cos-mono cos-scenario-amt ${d >= 0 ? 'is-alert' : 'is-ok'}`}>
                      {fmt(d)}
                    </span>
                    <button
                      type="button"
                      className="cos-scenario-remove"
                      onClick={() => onRemove(key)}
                      aria-label={`Remove ${catName} adjustment`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <div className="cos-scenario-total">
                <span className="cos-label">Net Impact</span>
                <span className={`cos-mono ${totalDelta >= 0 ? 'is-alert' : 'is-ok'}`}>
                  {fmt(totalDelta)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
