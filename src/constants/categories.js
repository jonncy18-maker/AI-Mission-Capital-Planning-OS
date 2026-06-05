/* ============================================================
   Capital Planning OS — FY26 Category Map  (LOCKED structure)
   ------------------------------------------------------------
   Source: FY26_Budget.xlsx. 11 active Groups (Business excluded),
   40 Categories total. Each category carries an ANNUAL budget and
   a MONTHLY target. Category `type`:
     - 'fixed'        recurring, ~same amount each month
     - 'flexible'     variable month to month
     - 'nonMonthly'   lumpy / annual — compare annual remaining vs.
                      spent, NOT a flat monthly target
   For nonMonthly categories `monthly` is null on purpose.

   ⚠️  GROUP annual totals below are authoritative (from the brief).
       The per-CATEGORY splits are PLACEHOLDERS chosen to sum exactly
       to each group total, with known anchors fixed (Philippine
       Transfers = $7,317). Replace the per-category numbers with the
       real values from FY26_Budget.xlsx — the group totals must hold.
   ============================================================ */

// Annual group budgets — the locked, authoritative totals.
export const GROUP_BUDGETS = {
  'Housing':            11466,
  'Food & Dining':      15650,
  'Travel & Lifestyle': 22091,
  'Gifts & Donations':   9317,
  'Auto & Transport':    9904,
  'Health & Wellness':   2640,
  'Financial':           6117,
  'Shopping':            3775,
  'Education':           3000,
  'Bills & Utilities':   4332,
  'Other':                500,
  // 'Business':         EXCLUDED — see csvParser.js
};

export const EXCLUDED_GROUPS = ['Business'];

const mo = (annual) => Math.round((annual / 12) * 100) / 100;

/**
 * Category map. Keyed by Monarch Group name, in Monarch display order.
 * Each category: { name, type, annual, monthly }.
 * monthly is derived for fixed/flexible; null for nonMonthly.
 */
export const CATEGORIES = {
  'Housing': [
    { name: 'Rent',             type: 'fixed',      annual: 9000, monthly: mo(9000) },
    { name: 'Property Tax',     type: 'nonMonthly', annual: 1200, monthly: null },
    { name: 'Home Improvement', type: 'nonMonthly', annual: 600,  monthly: null },
    { name: 'Home Supplies',    type: 'flexible',   annual: 666,  monthly: mo(666) },
  ],
  'Food & Dining': [
    { name: 'Groceries',      type: 'flexible', annual: 8500, monthly: mo(8500) },
    { name: 'Restaurants',    type: 'flexible', annual: 4500, monthly: mo(4500) },
    { name: 'Fast Food',      type: 'flexible', annual: 1000, monthly: mo(1000) },
    { name: 'Coffee Shops',   type: 'flexible', annual: 1000, monthly: mo(1000) },
    { name: 'Alcohol & Bars', type: 'flexible', annual: 650,  monthly: mo(650) },
  ],
  'Travel & Lifestyle': [
    { name: 'Cruise',         type: 'nonMonthly', annual: 8000, monthly: null },
    { name: 'Airfare',        type: 'nonMonthly', annual: 6000, monthly: null },
    { name: 'Hotels',         type: 'nonMonthly', annual: 4000, monthly: null },
    { name: 'Entertainment',  type: 'flexible',   annual: 2091, monthly: mo(2091) },
    { name: 'Subscriptions',  type: 'fixed',      annual: 2000, monthly: mo(2000) },
  ],
  'Gifts & Donations': [
    // Anchor: Philippine Transfers is a single Monarch category, $7,317/yr.
    { name: 'Philippine Transfers', type: 'fixed',      annual: 7317, monthly: mo(7317) },
    { name: 'Charity',              type: 'flexible',   annual: 1500, monthly: mo(1500) },
    { name: 'Gifts',                type: 'nonMonthly', annual: 500,  monthly: null },
  ],
  'Auto & Transport': [
    { name: 'Auto Payment',     type: 'fixed',      annual: 5000, monthly: mo(5000) },
    { name: 'Gas',              type: 'flexible',   annual: 2400, monthly: mo(2400) },
    { name: 'Auto Insurance',   type: 'fixed',      annual: 1200, monthly: mo(1200) },
    { name: 'Auto Maintenance', type: 'nonMonthly', annual: 700,  monthly: null },
    { name: 'Parking & Tolls',  type: 'flexible',   annual: 604,  monthly: mo(604) },
  ],
  'Health & Wellness': [
    { name: 'Medical',   type: 'flexible',   annual: 1000, monthly: mo(1000) },
    { name: 'Dental',    type: 'nonMonthly', annual: 500,  monthly: null },
    { name: 'Fitness',   type: 'fixed',      annual: 840,  monthly: mo(840) },
    { name: 'Pharmacy',  type: 'flexible',   annual: 300,  monthly: mo(300) },
  ],
  'Financial': [
    { name: 'Advisory Fee',    type: 'fixed',      annual: 3600, monthly: mo(3600) },
    { name: 'Financial Fees',  type: 'flexible',   annual: 1200, monthly: mo(1200) },
    { name: 'Taxes',           type: 'nonMonthly', annual: 1317, monthly: null },
  ],
  'Shopping': [
    { name: 'Clothing',            type: 'flexible',   annual: 1600, monthly: mo(1600) },
    { name: 'Electronics',         type: 'nonMonthly', annual: 1000, monthly: null },
    { name: 'Home Goods',          type: 'flexible',   annual: 600,  monthly: mo(600) },
    { name: 'General Merchandise', type: 'flexible',   annual: 575,  monthly: mo(575) },
  ],
  'Education': [
    { name: 'Tuition',          type: 'fixed',      annual: 2400, monthly: mo(2400) },
    { name: 'Books & Supplies', type: 'nonMonthly', annual: 600,  monthly: null },
  ],
  'Bills & Utilities': [
    { name: 'Electric',              type: 'flexible', annual: 1800, monthly: mo(1800) },
    { name: 'Phone',                 type: 'fixed',    annual: 900,  monthly: mo(900) },
    { name: 'Internet',              type: 'fixed',    annual: 900,  monthly: mo(900) },
    // Netflix is booked here under TV Streaming Services and split by the parser.
    { name: 'TV Streaming Services', type: 'fixed',    annual: 732,  monthly: mo(732) },
  ],
  'Other': [
    { name: 'Miscellaneous', type: 'flexible', annual: 500, monthly: mo(500) },
  ],
};

// Monarch display order for Groups in the Category Snapshot.
export const GROUP_ORDER = Object.keys(GROUP_BUDGETS);

/* ── Mission Capital overlay ─────────────────────────────────
   Derived buckets shown in the sidebar — NOT part of the
   Group/Category grid. Values are given directly in the brief
   (they do not simply equal a group total; treat as authoritative).
   ──────────────────────────────────────────────────────────── */
export const MISSION_CAPITAL = [
  {
    key: 'education',
    label: 'Mission Education',
    note: 'Education group + Philippine Transfers',
    annual: 8465,
    monthly: 706,
  },
  {
    key: 'family',
    label: 'Family Support',
    note: 'Netflix < $6 split only',
    annual: 1852,
    monthly: 154,
  },
  {
    key: 'nextgen',
    label: 'NextGen Nurses',
    note: 'Netflix ≥ $6 split',
    annual: 84,
    monthly: 7,
  },
];

// Netflix per-transaction split threshold (TV Streaming Services).
export const NETFLIX_SPLIT_THRESHOLD = 6; // USD
