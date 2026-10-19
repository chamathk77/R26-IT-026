const CostExpense = require('../../models/costExpense');
const History = require('../../models/history');

const REPORTING_TIMEZONE = process.env.FORECAST_TIMEZONE || 'Asia/Colombo';
const DEFAULT_LOOKBACK_MONTHS = 36;

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function addMonths(year, month, offset) {
  const zeroBased = month - 1 + offset;
  return {
    year: year + Math.floor(zeroBased / 12),
    month: (((zeroBased % 12) + 12) % 12) + 1,
  };
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString('en-LK', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function buildBranchFilter(shopId, branchId, extra = {}) {
  return { shopId, branchId, ...extra };
}

/**
 * Today's calendar date in the reporting timezone as `YYYY-MM-DD`, so month
 * boundaries match the Mongo aggregation even when the server runs in UTC.
 */
function zonedDateKey(date, timeZone = REPORTING_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Daily sales totals (one row per day with at least one submitted order). */
async function aggregateDailySales(shopId, branchId, rangeStart) {
  const rows = await History.aggregate([
    {
      $match: buildBranchFilter(shopId, branchId, {
        status: 'submited',
        checkOutTime: { $gte: rangeStart },
      }),
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$checkOutTime',
            timezone: REPORTING_TIMEZONE,
          },
        },
        totalAmount: { $sum: '$totalAmount' },
        recordCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => ({
    date: row._id,
    sales: Number(row.totalAmount.toFixed(2)),
    orders: row.recordCount,
  }));
}

function monthlyFromDaily(daily) {
  const byMonth = new Map();
  for (const day of daily) {
    const key = day.date.slice(0, 7);
    const entry = byMonth.get(key) ?? { totalAmount: 0, recordCount: 0, activeDays: 0 };
    entry.totalAmount += day.sales;
    entry.recordCount += day.orders;
    entry.activeDays += 1;
    byMonth.set(key, entry);
  }
  return byMonth;
}

async function aggregateMonthlyCosts(shopId, branchId, rangeStart) {
  const rows = await CostExpense.aggregate([
    {
      $match: buildBranchFilter(shopId, branchId, {
        purchaseDate: { $gte: rangeStart },
      }),
    },
    {
      $group: {
        _id: {
          year: { $year: { date: '$purchaseDate', timezone: REPORTING_TIMEZONE } },
          month: { $month: { date: '$purchaseDate', timezone: REPORTING_TIMEZONE } },
        },
        totalAmount: { $sum: '$amount' },
        recordCount: { $sum: 1 },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [
      monthKey(row._id.year, row._id.month),
      { totalAmount: row.totalAmount, recordCount: row.recordCount },
    ]),
  );
}

/**
 * Returns one row per calendar month with gaps filled as zero, so the
 * forecasting models always receive an evenly spaced series.
 *
 * The month currently in progress is flagged `partial` — it is reported for
 * context but must be excluded from model training, otherwise a half-finished
 * month reads as a sudden collapse in demand.
 *
 * Also returns the daily sales rows (for the weekday profile and month
 * pacing) and today's date in the reporting timezone.
 */
async function getMonthlySeries(shopId, branchId, options = {}) {
  const lookbackMonths = options.lookbackMonths ?? DEFAULT_LOOKBACK_MONTHS;
  const now = options.now ?? new Date();

  const today = zonedDateKey(now);
  const [currentYear, currentMonth] = today.split('-').map(Number);
  const firstMonth = addMonths(currentYear, currentMonth, -(lookbackMonths - 1));
  // One day early so no timezone offset can cut off the first month; any
  // earlier month this picks up is ignored by the loop below.
  const rangeStart = new Date(Date.UTC(firstMonth.year, firstMonth.month - 1, 1) - 86_400_000);

  const [daily, costsByMonth] = await Promise.all([
    aggregateDailySales(shopId, branchId, rangeStart),
    aggregateMonthlyCosts(shopId, branchId, rangeStart),
  ]);
  const salesByMonth = monthlyFromDaily(daily);

  const months = [];
  for (let offset = 0; offset < lookbackMonths; offset += 1) {
    const { year, month } = addMonths(firstMonth.year, firstMonth.month, offset);
    const key = monthKey(year, month);
    const sales = salesByMonth.get(key);
    const costs = costsByMonth.get(key);
    const isPartial = year === currentYear && month === currentMonth;

    months.push({
      month: key,
      label: monthLabel(key),
      sales: Number((sales?.totalAmount ?? 0).toFixed(2)),
      costs: Number((costs?.totalAmount ?? 0).toFixed(2)),
      profit: Number(((sales?.totalAmount ?? 0) - (costs?.totalAmount ?? 0)).toFixed(2)),
      orderCount: sales?.recordCount ?? 0,
      expenseCount: costs?.recordCount ?? 0,
      activeDays: sales?.activeDays ?? 0,
      partial: isPartial,
    });
  }

  const firstActivityIndex = options.keepEmptyMonths
    ? 0
    : months.findIndex(
        (row) => row.orderCount > 0 || row.expenseCount > 0,
      );

  const keptMonths = firstActivityIndex === -1 ? [] : months.slice(firstActivityIndex);
  const firstKept = keptMonths[0]?.month ?? '9999-99';

  return {
    months: keptMonths,
    daily: daily.filter((day) => day.date.slice(0, 7) >= firstKept),
    today,
    timezone: REPORTING_TIMEZONE,
  };
}

module.exports = {
  getMonthlySeries,
  zonedDateKey,
  monthKey,
  addMonths,
  monthLabel,
  REPORTING_TIMEZONE,
};
