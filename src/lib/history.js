const KEY = 'cos_history_v1';

export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

function persist(history) {
  try { localStorage.setItem(KEY, JSON.stringify(history)); } catch {}
}

/** 'YYYY-MM-DD' → 'YYYY-MM' */
export function monthKey(isoDate) {
  return isoDate ? isoDate.slice(0, 7) : null;
}

/**
 * Upsert the aggregated snapshot for the month of parsed.dateRange.max.
 * Only stores group totals (not raw transactions) to stay within storage limits.
 * Returns the updated history object.
 */
export function upsertMonth(parsed) {
  const key = monthKey(parsed.dateRange?.max);
  if (!key) return loadHistory();
  const history = loadHistory();
  history[key] = {
    groups: parsed.groups,
    netflixSplit: parsed.netflixSplit,
    transactionCount: parsed.transactionCount,
  };
  persist(history);
  return history;
}
