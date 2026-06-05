# Capital Planning OS — Phase 2 Updates

## What changed (this batch)

### 1. VITE_ANTHROPIC_KEY wired into deployment
The AI briefing was failing with "Missing VITE_ANTHROPIC_KEY" because the key wasn't being
passed to the GitHub Actions build. The deploy workflow now reads three secrets at build time:

| Secret name | Purpose |
|---|---|
| `VITE_ANTHROPIC_KEY` | Anthropic API key for AI executive briefing |
| `VITE_ANTHROPIC_MODEL` | (optional) Override model id |
| `VITE_SHEETS_WEBHOOK_URL` | Apps Script URL for Google Sheets sync |

**To activate:** Go to your repo → Settings → Secrets and variables → Actions → New repository secret.
Add `VITE_ANTHROPIC_KEY` with your key from console.anthropic.com. Re-run the deploy workflow after
saving.

---

### 2. Google Sheets — transactions tab sync
After each Monarch CSV upload the raw rows are posted to a Google Apps Script web app
that overwrites the "transactions" tab in your linked Google Sheet.

**One-time setup:**
1. Open [your Google Sheet](https://docs.google.com/spreadsheets/d/1DAzTKjV0eSJPuIFD6H3DuVBG7SqJr6dMg3XRhJFmTrs/edit)
2. Extensions → Apps Script
3. Paste the contents of `google-apps-script/sheets-webhook.js`
4. Save → Deploy → New deployment → Web app
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the deployment URL
6. Add it as `VITE_SHEETS_WEBHOOK_URL` in GitHub Actions secrets
7. Trigger a new deploy (or push any change to `main`)

**Behavior:** Every CSV upload overwrites the entire "transactions" tab — all rows including
the header row. No append, no merge.

**Files added:**
- `src/lib/sheets.js` — client-side sync helper
- `google-apps-script/sheets-webhook.js` — Apps Script to paste in your Sheet

---

### 3. Dark mode contrast improved
Text tokens in dark mode were too dim to read comfortably. All secondary and muted text
colors have been brightened, and the traffic-light status colors (ok/warn/alert) are now
visually distinct against the dark background.

| Token | Before | After |
|---|---|---|
| `--text-secondary` | `#7a6a58` | `#C0AE9C` |
| `--text-muted` | `#5a4a38` | `#9A8878` |
| `--ok` | `#3a8a3a` | `#5CB85C` |
| `--warn` | `#b07820` | `#D4962A` |
| `--alert` | `#a02020` | `#D94040` |

**File changed:** `src/tokens.css`

---

### 4. Actuals-through date in the banner
The header now shows **"Actuals through Jun 4, 2026"** (the date of the last transaction
in the uploaded CSV) instead of just the upload timestamp. The `csvParser` already tracked
`dateRange.max`; this change wires it through to the Header component.

**Files changed:** `src/App.jsx`, `src/components/Header.jsx`

---

### 5. Sidebar independently scrollable
The right-side summary panel is now independently scrollable when you hover over it.
Previously the sidebar would only scroll once the main content column had scrolled to its
bottom. Added `overflow-y: auto` and `max-height: calc(100vh - 148px)` to `.cos-sidebar`.

**File changed:** `src/app.css`

---

## Phase 2 — planned next

- [ ] Budget editor — edit GROUP_BUDGETS directly in the UI without touching the code
- [ ] Period filtering — actually slice CSV transactions by the selected period tab
- [ ] Scenario planner — "what if I cut Entertainment by $200?" impact preview
- [ ] Transaction drill-down — click a category row to see individual transactions
- [ ] CSV-less mode — connect Monarch API directly (no export step)
- [ ] Multi-month history — upload multiple months, see trends over time
- [ ] PDF/PNG export — export the briefing and snapshot as a shareable document
