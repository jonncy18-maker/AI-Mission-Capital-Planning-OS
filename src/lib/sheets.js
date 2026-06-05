/* ============================================================
   Capital Planning OS — Google Sheets sync
   ------------------------------------------------------------
   Sends the raw Monarch CSV rows to a Google Apps Script web
   app that overwrites the "transactions" tab in the configured
   spreadsheet.

   Setup (one-time):
   1. Open your Google Sheet → Extensions → Apps Script
   2. Paste the contents of google-apps-script/sheets-webhook.js
   3. Deploy → New deployment → Web app
      Execute as: Me  |  Who has access: Anyone
   4. Copy the deployment URL
   5. Add it as VITE_SHEETS_WEBHOOK_URL in GitHub Actions secrets
      (Settings → Secrets and variables → Actions → New secret)
   ============================================================ */

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      out.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/**
 * Overwrite the "transactions" sheet tab with the raw CSV rows.
 * Uses mode:'no-cors' + text/plain body so no CORS preflight is sent
 * (Google Apps Script web apps don't respond to OPTIONS).
 * @param {string} csvText  Raw CSV file contents
 * @param {string} webhookUrl  Apps Script web app deployment URL
 */
export async function syncToSheets(csvText, webhookUrl) {
  const rows = csvText
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map(splitCsvLine);

  await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ rows }),
  });
}
