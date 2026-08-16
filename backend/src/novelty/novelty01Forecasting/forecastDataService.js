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

async function aggregateMonthlySales(shopId, branchId, rangeStart) {
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
          year: { $year: { date: '$checkOutTime', timezone: REPORTING_TIMEZONE } },
          month: { $month: { date: '$checkOutTime', timezone: REPORTING_TIMEZONE } },
        },
        totalAmount: { $sum: '$totalAmount' },
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
 */
async function getMonthlySeries(shopId, branchId, options = {}) {
  const lookbackMonths = options.lookbackMonths ?? DEFAULT_LOOKBACK_MONTHS;
  const now = options.now ?? new Date();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const firstMonth = addMonths(currentYear, currentMonth, -(lookbackMonths - 1));
  const rangeStart = new Date(firstMonth.year, firstMonth.month - 1, 1, 0, 0, 0, 0);

  const [salesByMonth, costsByMonth] = await Promise.all([
    aggregateMonthlySales(shopId, branchId, rangeStart),
    aggregateMonthlyCosts(shopId, branchId, rangeStart),
  ]);

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
      partial: isPartial,
    });
  }

  const firstActivityIndex = months.findIndex(
    (row) => row.orderCount > 0 || row.expenseCount > 0,
  );

  return {
    months: firstActivityIndex === -1 ? [] : months.slice(firstActivityIndex),
    timezone: REPORTING_TIMEZONE,
  };
}

module.exports = {
  getMonthlySeries,
  monthKey,
  addMonths,
  monthLabel,
  REPORTING_TIMEZONE,
};
