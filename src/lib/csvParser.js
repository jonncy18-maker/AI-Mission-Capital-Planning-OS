/* ============================================================
   Capital Planning OS — Monarch CSV parser
   ------------------------------------------------------------
   Monarch's transaction export has (at least) these columns:
     Date, Merchant, Category, Group, Amount, ...
   We build a Group → Category hierarchy of ACTUALS and apply the
   locked special rules from the brief.

   Special rules:
     1. Business group is excluded entirely.
     2. Netflix on "TV Streaming Services" splits per transaction:
        >= $6  -> NextGen Nurses    (Mission Capital)
        <  $6  -> Family Support    (Mission Capital)
        The transaction still rolls up under TV Streaming Services
        in the Category Snapshot; the split only feeds Mission Capital.
     3. Philippine Transfers is a single category; no recipient
        breakdown is parseable — report as one line.
   ============================================================ */

import { EXCLUDED_GROUPS, NETFLIX_SPLIT_THRESHOLD } from '../constants/categories.js';

/** Minimal, dependency-free CSV line splitter that respects quoted fields. */
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Normalize a Monarch amount field to a positive spend number. */
function toSpend(raw) {
  if (raw == null) return 0;
  const n = parseFloat(String(raw).replace(/[$,]/g, ''));
  if (Number.isNaN(n)) return 0;
  // Monarch exports expenses as negatives; treat magnitude as spend.
  return Math.abs(n);
}

/**
 * Parse a Monarch CSV string.
 * @returns {{
 *   groups: Record<string, { total: number, categories: Record<string, number> }>,
 *   netflixSplit: { nextgen: number, family: number },
 *   transactionCount: number,
 *   dateRange: { min: string|null, max: string|null },
 *   excluded: string[]
 * }}
 */
export function parseMonarchCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV appears empty or has no data rows.');
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const col = (name) => header.indexOf(name);

  const iDate     = col('date');
  const iCategory = col('category');
  const iGroup    = col('group');
  const iAmount   = col('amount');
  const iMerchant = col('merchant');

  if (iCategory === -1 || iGroup === -1 || iAmount === -1) {
    throw new Error('CSV is missing required columns (Category, Group, Amount).');
  }

  const groups = {};
  const netflixSplit = { nextgen: 0, family: 0 };
  let transactionCount = 0;
  let min = null;
  let max = null;

  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    const group = cells[iGroup] || 'Other';

    // Rule 1 — exclude Business entirely.
    if (EXCLUDED_GROUPS.includes(group)) continue;

    const category = cells[iCategory] || 'Uncategorized';
    const amount = toSpend(cells[iAmount]);
    const merchant = iMerchant !== -1 ? (cells[iMerchant] || '') : '';
    const date = iDate !== -1 ? cells[iDate] : null;

    if (date) {
      if (min === null || date < min) min = date;
      if (max === null || date > max) max = date;
    }

    // Roll up into Group → Category.
    if (!groups[group]) groups[group] = { total: 0, categories: {} };
    groups[group].total += amount;
    groups[group].categories[category] =
      (groups[group].categories[category] || 0) + amount;
    transactionCount++;

    // Rule 2 — Netflix split on TV Streaming Services (feeds Mission Capital).
    if (
      category === 'TV Streaming Services' &&
      /netflix/i.test(merchant)
    ) {
      if (amount >= NETFLIX_SPLIT_THRESHOLD) netflixSplit.nextgen += amount;
      else netflixSplit.family += amount;
    }
  }

  return {
    groups,
    netflixSplit,
    transactionCount,
    dateRange: { min, max },
    excluded: EXCLUDED_GROUPS.slice(),
  };
}

/**
 * Read a File (from an <input type="file">) and parse it.
 * @param {File} file
 */
export function parseMonarchFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = () => {
      try {
        resolve(parseMonarchCsv(String(reader.result)));
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
