const KEY = 'cos_budget_v1';

export function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function saveOverrides(overrides) {
  try { localStorage.setItem(KEY, JSON.stringify(overrides)); } catch {}
}

export function resetOverrides() {
  try { localStorage.removeItem(KEY); } catch {}
}

/**
 * Returns the effective display budget for a category, checking overrides first.
 * - fixed/flexible: monthly value
 * - nonMonthly:     annual value
 */
export function effectiveBudget(group, cat, overrides) {
  const key = `${group}/${cat.name}`;
  if (overrides[key] != null) return overrides[key];
  return cat.type === 'nonMonthly' ? cat.annual : (cat.monthly || 0);
}
