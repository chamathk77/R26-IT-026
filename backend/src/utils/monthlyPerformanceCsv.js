/**
 * Reads monthly sales/cost from Analysis_Backend/data/monthly_performance.csv
 * (same source as the forecast training data).
 */
const fs = require('fs').promises;
const path = require('path');

function defaultCsvPath() {
  if (process.env.MONTHLY_PERFORMANCE_CSV) {
    return path.resolve(process.env.MONTHLY_PERFORMANCE_CSV);
  }
  return path.join(__dirname, '..', '..', '..', 'Analysis_Backend', 'data', 'monthly_performance.csv');
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function parseMonthlyPerformanceCsv(content) {
  const lines = content.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const mi = header.indexOf('month');
  const si = header.indexOf('sales');
  const ci = header.indexOf('cost');
  if (mi < 0 || si < 0 || ci < 0) {
    throw new Error('monthly_performance.csv must include columns: month, sales, cost');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const month = String(parts[mi]).trim();
    const sales = Number(parts[si]);
    const cost = Number(parts[ci]);
    if (!month || Number.isNaN(sales) || Number.isNaN(cost)) continue;
    rows.push({ month, sales: round2(sales), cost: round2(cost) });
  }

  rows.sort((a, b) => (a.month === b.month ? 0 : a.month < b.month ? -1 : 1));
  return rows;
}

async function readMonthlySeriesTail(limit) {
  const cap = Math.min(120, Math.max(1, limit));
  const csvPath = defaultCsvPath();
  const content = await fs.readFile(csvPath, 'utf8');
  const all = parseMonthlyPerformanceCsv(content);
  return all.slice(-cap);
}

module.exports = {
  defaultCsvPath,
  readMonthlySeriesTail,
};
