# AI Mission Capital Planning OS

A personal CFO dashboard built over [Monarch Money](https://monarchmoney.com) CSV exports, with an AI executive briefing powered by Claude.

**Live app:** https://jonncy18-maker.github.io/AI-Mission-Capital-Planning-OS/

## What it does

Upload your Monarch Money CSV and the app generates:

- **AI Executive Briefing** — a CFO-tone summary of your spending, flagging anomalies and trends
- **Category Snapshot** — spending across 11 groups / 40 categories mapped to your FY26 budget
- **Mission Capital Bars** — tracks how much of your discretionary spend goes toward your highest-priority goals (Education, Family Support, NextGen Nurses)
- **Dark / Light mode** — Editorial Finance design system (Playfair Display + Lato + DM Mono)
- **Google Sheets sync** — raw transactions optionally posted to a linked Google Sheet after each upload

> **Note:** The Period tabs (MTD / YTD / trailing periods) are visible in the UI but do not yet filter data — all views reflect the full date range of the uploaded CSV. Period filtering is the top roadmap item.

## Stack

| Layer | Tech |
|---|---|
| UI | React 18 + Vite 5 |
| Styling | Custom CSS design tokens |
| AI | Anthropic Claude API |
| CSV parsing | Custom Monarch Money parser (no external deps) |
| Sheets sync | Google Apps Script webhook |
| Deploy | GitHub Pages via GitHub Actions |

## Local development

```bash
# 1. Copy the env template and add your Anthropic API key
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start the dev server (opens at http://localhost:5173)
npm run dev
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_ANTHROPIC_KEY` | Yes | Anthropic API key — get one at console.anthropic.com |
| `VITE_ANTHROPIC_MODEL` | No | Override model id (default: `claude-sonnet-4-20250514`) |
| `VITE_SHEETS_WEBHOOK_URL` | No | Apps Script web app URL for Google Sheets sync |

For deployment, add these as GitHub Actions secrets under **Settings → Secrets and variables → Actions**.

## CSV format

Export your transactions from Monarch Money as CSV. The parser expects columns:

```
Date, Merchant, Category, Account, Original Statement, Notes, Amount, Tags, Owner
```

- Business transactions are **automatically excluded**
- Netflix is **split by amount**: ≥ $6 → NextGen Nurses mission bar; < $6 → Family Support mission bar (both still roll up under TV Streaming Services in the Category Snapshot)

## Google Sheets sync

After each CSV upload, raw transaction rows are posted to a Google Apps Script web app that **overwrites** the "transactions" tab in a linked Google Sheet.

**One-time setup:**
1. Open your Google Sheet → Extensions → Apps Script
2. Paste the contents of `google-apps-script/sheets-webhook.js`
3. Deploy → New deployment → Web app (Execute as: Me, Access: Anyone)
4. Copy the URL and add it as `VITE_SHEETS_WEBHOOK_URL` in GitHub Actions secrets
5. Trigger a new deploy

## Deployment

The site deploys automatically to GitHub Pages on every push to `main` via the included GitHub Actions workflow.

To deploy manually: Actions tab → **Deploy to GitHub Pages** → Run workflow.

## Category map

Spending maps to **11 groups** (Housing, Food & Dining, Travel & Lifestyle, Gifts & Donations, Auto & Transport, Health & Wellness, Financial, Shopping, Education, Bills & Utilities, Other) with **40 leaf categories** — all locked to the FY26 budget in `src/constants/categories.js`. Total FY26 budget: **$88,792**.

## Roadmap

Features in priority order:

- [ ] **Period filtering** — actually slice CSV transactions by the selected period tab (MTD, YTD, etc.)
- [ ] **Transaction drill-down** — click a category row to see individual transactions behind the number
- [ ] **Budget editor** — edit group budgets directly in the UI without touching code
- [ ] **Scenario planner** — "what if I cut Entertainment by $200?" impact preview (ScenarioStub placeholder already in UI)
- [ ] **Multi-month history** — upload multiple months' CSVs, see trends over time
- [ ] **PDF/PNG export** — export the briefing and snapshot as a shareable document
- [ ] **CSV-less mode** — connect Monarch API directly (no export step)
