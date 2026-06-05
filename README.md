# AI Mission Capital Planning OS

A personal CFO dashboard built over [Monarch Money](https://monarchmoney.com) CSV exports, with an AI executive briefing powered by Claude.

## What it does

Upload your Monarch Money CSV and the app generates:

- **AI Executive Briefing** — a CFO-tone summary of your spending, flagging anomalies and trends
- **Category Snapshot** — spending across 11 groups / 40 categories mapped to your FY26 budget
- **Mission Capital Bars** — tracks how much of your discretionary spend goes toward your highest-priority goals
- **Period Tabs** — filter by month or trailing periods
- **Dark / Light mode** — Editorial Finance design system (Playfair Display + Lato)

## Stack

| Layer | Tech |
|---|---|
| UI | React 18 + Vite 5 |
| Styling | Custom CSS design tokens |
| AI | Anthropic Claude API |
| CSV parsing | Custom Monarch Money parser |
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

| Variable | Description |
|---|---|
| `VITE_ANTHROPIC_API_KEY` | Your Anthropic API key — get one at console.anthropic.com |

## CSV format

Export your transactions from Monarch Money as CSV. The parser expects columns:

```
Date, Merchant, Category, Account, Amount
```

Business transactions are automatically excluded. Netflix is split between Entertainment and Mission Capital per built-in rules.

## Deployment

The site deploys automatically to GitHub Pages on every push to `main` via the included GitHub Actions workflow. The live URL is:

```
https://jonncy18-maker.github.io/AI-Mission-Capital-Planning-OS/
```

To deploy manually, trigger the **Deploy to GitHub Pages** workflow from the Actions tab.

## Category map

Spending is mapped to 11 groups (Housing, Food, Transport, Health, Personal Care, Entertainment, Shopping, Giving, Travel, Business, Savings) with 40 leaf categories — all locked to the FY26 budget in `src/constants/categories.js`.
