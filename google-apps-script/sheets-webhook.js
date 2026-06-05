/**
 * Capital Planning OS — Google Sheets webhook
 *
 * Deploy this script in your Google Sheet:
 *   Extensions → Apps Script → paste this code → Save
 *   Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone
 *   Click Deploy → copy the URL
 *
 * Add the URL as VITE_SHEETS_WEBHOOK_URL in GitHub Actions secrets.
 *
 * The script clears the "transactions" tab and writes all rows from
 * the uploaded Monarch CSV (including the header row).
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let sheet = ss.getSheetByName('transactions');
    if (!sheet) sheet = ss.insertSheet('transactions');

    sheet.clearContents();

    if (data.rows && data.rows.length > 0) {
      sheet.getRange(1, 1, data.rows.length, data.rows[0].length)
        .setValues(data.rows);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, rows: data.rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
