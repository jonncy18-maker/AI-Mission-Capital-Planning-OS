/* ============================================================
   Capital Planning OS — Monarch CSV parser
   ------------------------------------------------------------
   Monarch's transaction export columns:
     Date, Merchant, Category, Account, Original Statement,
     Notes, Amount, Tags, Owner
   There is no Group column. We derive the internal Group from
   the Category name using CATEGORY_MAP below.

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

/**
 * Maps Monarch category names (compared lowercase) to the internal
 * { group, category } used for budget rollup. Group and category
 * names must match constants/categories.js exactly.
 */
const CATEGORY_MAP = {
  // Housing
  'rent':                    { group: 'Housing',            category: 'Rent' },
  'home improvement':        { group: 'Housing',            category: 'Home Improvement' },
  'home supplies':           { group: 'Housing',            category: 'Home Supplies' },
  'property tax':            { group: 'Housing',            category: 'Property Tax' },
  // Food & Dining
  'groceries':               { group: 'Food & Dining',      category: 'Groceries' },
  'restaurants & bars':      { group: 'Food & Dining',      category: 'Restaurants' },
  'restaurants':             { group: 'Food & Dining',      category: 'Restaurants' },
  'fast food':               { group: 'Food & Dining',      category: 'Fast Food' },
  'coffee shops':            { group: 'Food & Dining',      category: 'Coffee Shops' },
  'alcohol & bars':          { group: 'Food & Dining',      category: 'Alcohol & Bars' },
  'travel - restaurants':    { group: 'Food & Dining',      category: 'Restaurants' },
  // Travel & Lifestyle
  'cruise':                  { group: 'Travel & Lifestyle', category: 'Cruise' },
  'airfare':                 { group: 'Travel & Lifestyle', category: 'Airfare' },
  'hotel':                   { group: 'Travel & Lifestyle', category: 'Hotels' },
  'hotels':                  { group: 'Travel & Lifestyle', category: 'Hotels' },
  'amusement':               { group: 'Travel & Lifestyle', category: 'Entertainment' },
  'entertainment':           { group: 'Travel & Lifestyle', category: 'Entertainment' },
  'annual subscriptions':    { group: 'Travel & Lifestyle', category: 'Subscriptions' },
  'subscriptions':           { group: 'Travel & Lifestyle', category: 'Subscriptions' },
  // Gifts & Donations
  'philippine transfers':    { group: 'Gifts & Donations',  category: 'Philippine Transfers' },
  'gifts':                   { group: 'Gifts & Donations',  category: 'Gifts' },
  'charity':                 { group: 'Gifts & Donations',  category: 'Charity' },
  // Auto & Transport
  'auto payment':            { group: 'Auto & Transport',   category: 'Auto Payment' },
  'gas':                     { group: 'Auto & Transport',   category: 'Gas' },
  'car insurance':           { group: 'Auto & Transport',   category: 'Auto Insurance' },
  'auto insurance':          { group: 'Auto & Transport',   category: 'Auto Insurance' },
  'auto maintenance':        { group: 'Auto & Transport',   category: 'Auto Maintenance' },
  'parking & tolls':         { group: 'Auto & Transport',   category: 'Parking & Tolls' },
  'taxi & ride shares':      { group: 'Auto & Transport',   category: 'Parking & Tolls' },
  // Health & Wellness
  'medical':                 { group: 'Health & Wellness',  category: 'Medical' },
  'dental':                  { group: 'Health & Wellness',  category: 'Dental' },
  'dentist':                 { group: 'Health & Wellness',  category: 'Dental' },
  'fitness':                 { group: 'Health & Wellness',  category: 'Fitness' },
  'gym':                     { group: 'Health & Wellness',  category: 'Fitness' },
  'pharmacy':                { group: 'Health & Wellness',  category: 'Pharmacy' },
  'pets':                    { group: 'Health & Wellness',  category: 'Medical' },
  // Financial
  'financial fees':          { group: 'Financial',          category: 'Financial Fees' },
  'taxes':                   { group: 'Financial',          category: 'Taxes' },
  'advisory fee':            { group: 'Financial',          category: 'Advisory Fee' },
  'student loans':           { group: 'Financial',          category: 'Financial Fees' },
  'cash & atm':              { group: 'Financial',          category: 'Financial Fees' },
  // Shopping
  'clothing':                { group: 'Shopping',           category: 'Clothing' },
  'electronics':             { group: 'Shopping',           category: 'Electronics' },
  'home goods':              { group: 'Shopping',           category: 'Home Goods' },
  'shopping':                { group: 'Shopping',           category: 'General Merchandise' },
  // Education
  'tuition':                 { group: 'Education',          category: 'Tuition' },
  'books & supplies':        { group: 'Education',          category: 'Books & Supplies' },
  'language learning':       { group: 'Education',          category: 'Tuition' },
  // Bills & Utilities
  'electric':                { group: 'Bills & Utilities',  category: 'Electric' },
  'phone':                   { group: 'Bills & Utilities',  category: 'Phone' },
  'internet':                { group: 'Bills & Utilities',  category: 'Internet' },
  'tv streaming services':   { group: 'Bills & Utilities',  category: 'TV Streaming Services' },
  'philippines phone plans': { group: 'Bills & Utilities',  category: 'Phone' },
  'storage':                 { group: 'Bills & Utilities',  category: 'Storage' },
  'cloud services':          { group: 'Bills & Utilities',  category: 'Cloud Services' },
  // Other
  'miscellaneous':           { group: 'Other',              category: 'Miscellaneous' },
  'uncategorized':           { group: 'Other',              category: 'Miscellaneous' },
  'haircuts':                { group: 'Other',              category: 'Miscellaneous' },
};

/** Derive internal { group, category } from a raw Monarch category string. */
function mapCategory(monarchCategory) {
  const key = (monarchCategory || '').toLowerCase().trim();
  return CATEGORY_MAP[key] || { group: 'Other', category: monarchCategory || 'Miscellaneous' };
}

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
  const iAmount   = col('amount');
  const iMerchant = col('merchant');

  if (iCategory === -1 || iAmount === -1) {
    throw new Error('CSV missing Category / Amount columns.');
  }

  const groups = {};
  const netflixSplit = { nextgen: 0, family: 0 };
  const transactions = [];
  let min = null;
  let max = null;

  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    const monarchCategory = cells[iCategory] || 'Uncategorized';
    const { group, category } = mapCategory(monarchCategory);

    // Rule 1 — exclude Business entirely.
    if (EXCLUDED_GROUPS.includes(group)) continue;

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

    // Rule 2 — Netflix split on TV Streaming Services (feeds Mission Capital).
    const isNetflix =
      category === 'TV Streaming Services' && /netflix/i.test(merchant);
    const isNetflixNextgen = isNetflix && amount >= NETFLIX_SPLIT_THRESHOLD;

    if (isNetflix) {
      if (isNetflixNextgen) netflixSplit.nextgen += amount;
      else netflixSplit.family += amount;
    }

    transactions.push({ date, merchant, group, category, amount, isNetflix, isNetflixNextgen });
  }

  return {
    groups,
    netflixSplit,
    transactions,
    transactionCount: transactions.length,
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
