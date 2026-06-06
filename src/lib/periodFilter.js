/**
 * Filters a transactions array to the active period, then re-aggregates
 * into the same shape that csvParser.parseMonarchCsv() returns
 * (groups, netflixSplit, transactionCount, dateRange).
 *
 * Reference date (refDateStr) is the max date of the full CSV so that
 * "This Month" and "Rolling 30" are relative to the data, not the clock.
 */

export function filterByPeriod(transactions, period, refDateStr) {
  if (!transactions?.length) return transactions ?? [];
  if (!refDateStr) return transactions;

  const ref = new Date(refDateStr + 'T00:00:00');
  const refYear = ref.getFullYear();
  const refMonth = ref.getMonth(); // 0-indexed

  switch (period) {
    case 'month':
      return transactions.filter((tx) => {
        const d = new Date(tx.date + 'T00:00:00');
        return d.getFullYear() === refYear && d.getMonth() === refMonth;
      });

    case 'rolling30': {
      const cutoff = new Date(ref);
      cutoff.setDate(cutoff.getDate() - 30);
      return transactions.filter((tx) => {
        const d = new Date(tx.date + 'T00:00:00');
        return d >= cutoff && d <= ref;
      });
    }

    case 'ytd':
      return transactions.filter((tx) => {
        const d = new Date(tx.date + 'T00:00:00');
        return d.getFullYear() === refYear && d <= ref;
      });

    case 'lastYear':
      return transactions.filter((tx) => {
        const d = new Date(tx.date + 'T00:00:00');
        return d.getFullYear() === refYear - 1;
      });

    default:
      return transactions;
  }
}

export function aggregateTransactions(transactions) {
  const groups = {};
  const netflixSplit = { nextgen: 0, family: 0 };
  let min = null;
  let max = null;

  for (const tx of transactions) {
    const { date, group, category, amount, isNetflix, isNetflixNextgen } = tx;

    if (date) {
      if (min === null || date < min) min = date;
      if (max === null || date > max) max = date;
    }

    if (!groups[group]) groups[group] = { total: 0, categories: {} };
    groups[group].total += amount;
    groups[group].categories[category] = (groups[group].categories[category] || 0) + amount;

    if (isNetflix) {
      if (isNetflixNextgen) netflixSplit.nextgen += amount;
      else netflixSplit.family += amount;
    }
  }

  return {
    groups,
    netflixSplit,
    transactionCount: transactions.length,
    dateRange: { min, max },
  };
}
