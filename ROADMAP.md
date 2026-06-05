# Capital Planning OS — Roadmap

## Current State (as of June 2026)

**Live:** https://jonncy18-maker.github.io/AI-Mission-Capital-Planning-OS/

### What's working
- Monarch Money CSV upload and parsing (40 categories, 11 groups, Business excluded)
- AI Executive Briefing via Claude API (CFO-tone, inline flag chips)
- Category Snapshot — 11 collapsible group cards, Fixed / Flexible / Non-Monthly tags, status-color borders
- Mission Capital bars — Education, Family Support, NextGen Nurses
- Period Summary sidebar — total spent, budgeted, variance, transaction count
- Dark / Light mode (Editorial Finance design system)
- Google Sheets sync — raw transactions posted to linked Sheet after each upload
- Session persistence — parsed data and briefing survive page refresh via localStorage
- GitHub Pages deployment via Actions with secrets injection

### Known gaps (layout / UX)
- **Period tabs are decorative** — This Month / Rolling 30 / YTD / etc. are visible and selectable but do not filter any data. All views reflect the full uploaded CSV date range.
- **Footer nav is wired to nothing** — Briefing / Categories / Mission / Settings buttons set state but no component consumes it.
- **Mobile sidebar unreachable** — On mobile the grid collapses to 1-column; sidebar content (Mission Capital) is below the fold with no navigation to it.
- **Briefing headline is static** — "The month, in brief." doesn't reflect the selected period.
- **onUpload trigger is a DOM hack** — `document.querySelector('input[type=file]')` in BriefingCard; should be a passed ref.
- **Sidebar sticky offset hardcoded** — `top: 116px` tied to current header height; will break if header grows.

---

## Roadmap

### Phase 3 — Core UX integrity  *(do before adding new features)*

These fix the gap between what the UI implies and what it actually does.

- [ ] **Period filtering** — slice CSV transactions by the active period tab (MTD, YTD, Rolling 30, custom date range). The parser already tracks `dateRange`; need a filter step before snapshot/briefing.
- [ ] **Wire footer nav** — either remove the Briefing / Categories / Mission / Settings buttons or make them scroll to / reveal the relevant section. On mobile this doubles as the only way to reach Mission Capital.
- [ ] **Disable non-functional period tabs** — until filtering is implemented, dim all tabs except "This Month" and show a tooltip: "Period filtering coming soon."
- [ ] **Dynamic briefing headline** — update "The month, in brief." to reflect the active period (e.g., "Year to date, in brief.").
- [ ] **Fix onUpload ref** — lift the file input ref to App and pass `triggerUpload` as a callback instead of using a DOM query.
- [ ] **Sidebar sticky CSS variable** — replace hardcoded `top: 116px` with `--header-h` custom property set on `.cos-header`.

---

### Phase 4 — Data depth

Features that make the existing data more useful without changing the input format.

- [ ] **Transaction drill-down** — click a category row in the Snapshot to see the individual transactions behind the number (merchant, date, amount). Modal or expandable inline panel.
- [ ] **Budget editor** — edit group/category budgets directly in the UI. Write changes back to `localStorage` as a budget override layer on top of the locked `categories.js` defaults. Add a "Reset to FY26" option.
- [ ] **Multi-month history** — upload multiple months' CSVs; app merges them and shows month-over-month trend lines per category. Requires a new session storage schema (keyed by month).
- [ ] **Non-monthly category pacing** — for `nonMonthly` categories (Cruise, Taxes, etc.), show "X remaining of annual budget" instead of a monthly comparison, since a flat monthly budget is meaningless for lumpy spend.

---

### Phase 5 — Planning tools

Features that shift the app from *reporting* to *planning*.

- [ ] **Scenario planner** — "what if I cut Entertainment by $200?" — adjust any category and see the impact on group totals, Mission Capital bars, and overall variance. The `ScenarioStub` placeholder is already in the sidebar.
- [ ] **EOY Forecast** — project year-end spend by extrapolating MTD actuals. Show forecast vs. annual budget per group. Powers the "Forecast · EOY" period tab.
- [ ] **Custom date range** — powers the "Custom" period tab; let the user pick a start/end date to slice against.

---

### Phase 6 — Output and integrations

- [ ] **PDF / PNG export** — export the Executive Briefing + Category Snapshot as a shareable document (one page, print-ready).
- [ ] **Email briefing** — send the AI briefing to a configured email address on demand.
- [ ] **CSV-less mode** — connect Monarch API directly so no manual export step is needed. Depends on Monarch exposing a public API.
- [ ] **Recurring sync** — scheduled pull from Monarch (or Sheets) so data stays current without a manual upload.

---

## Design system notes

- Typography: Playfair Display (display) · Lato (body) · DM Mono (labels/numbers)
- Accent: `#7EB5D6` light / `#C9A84C` dark
- Radii are intentionally tight (`--r-lg: 6px`) — "editorial finance" not "consumer app"
- Color tokens for status: `--ok`, `--warn`, `--alert` (traffic lights)
- All themed values flow through CSS custom properties on `#cosRoot`; dark mode is a single `.dark` class toggle

## File map

| Path | Purpose |
|---|---|
| `src/App.jsx` | Root state, upload flow, session persistence |
| `src/components/Header.jsx` | Sticky header — wordmark, period tabs, theme toggle, upload button |
| `src/components/BriefingCard.jsx` | AI briefing display, empty state |
| `src/components/CategorySnapshot.jsx` | 11 collapsible group cards, category rows with type tags |
| `src/components/Sidebar.jsx` | Period Summary + Mission Capital bars |
| `src/components/ScenarioStub.jsx` | Placeholder for Phase 5 scenario planner |
| `src/lib/csvParser.js` | Monarch CSV → groups/categories structure, Netflix split logic |
| `src/lib/anthropic.js` | Claude API call, prompt builder, flag tokenizer |
| `src/lib/sheets.js` | Google Sheets webhook sync |
| `src/constants/categories.js` | FY26 budget map — 11 groups, 40 categories, Mission Capital overlay |
| `src/tokens.css` | Design tokens (color, type, spacing, radii) |
| `src/app.css` | Component styles |
| `google-apps-script/sheets-webhook.js` | Apps Script to paste into linked Google Sheet |
| `.github/workflows/deploy.yml` | CI/CD — build with secrets, deploy to GitHub Pages |
