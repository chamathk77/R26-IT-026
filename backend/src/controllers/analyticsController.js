const CostExpense = require('../models/costExpense');
const History = require('../models/history');

const ANALYTICS_PERIOD_KEYS = new Set([
  'current_month',
  'this_month',
  'last_month',
  'last_3_months',
  'last_6_months',
  'last_year',
  'last_1_year',
]);

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function normalizeBranchId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function requireShopAndBranchId(req, res) {
  const shopId = normalizeShopId(req.user?.shopId);
  if (!shopId) {
    res.status(400).json({ success: false, message: 'Shop id is required' });
    return null;
  }

  const branchId = normalizeBranchId(req.user?.branchId);
  if (!branchId) {
    res.status(400).json({
      success: false,
      message: 'Branch id is required. Please select a branch first.',
      code: 'BRANCH_REQUIRED',
    });
    return null;
  }

  return { shopId, branchId };
}

function buildAnalyticsBranchFilter(shopId, branchId, extra = {}) {
  return {
    shopId,
    branchId: normalizeBranchId(branchId),
    ...extra,
  };
}

function roundMoney(value) {
  return Number(Math.max(0, value).toFixed(2));
}

function roundSignedMoney(value) {
  return Number(value.toFixed(2));
}

function calculateProfitMetrics(salesTotal, costsTotal) {
  const profitAmount = roundSignedMoney(salesTotal - costsTotal);
  const profitMargin =
    salesTotal > 0 ? Number(((profitAmount / salesTotal) * 100).toFixed(2)) : 0;

  return {
    amount: profitAmount,
    margin: profitMargin,
  };
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getCurrentMonthRange(referenceDate = new Date()) {
  const monthStart = startOfDay(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
  );
  const monthEnd = endOfDay(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0),
  );
  return { monthStart, monthEnd };
}

function parseFilterDate(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function normalizeAnalyticsPeriod(value) {
  const period = String(value ?? '')
    .trim()
    .toLowerCase();

  if (period === 'this_month') {
    return 'current_month';
  }
  if (period === 'last_year') {
    return 'last_1_year';
  }
  return period;
}

function resolveAnalyticsDateRange(query) {
  const startDateRaw = parseFilterDate(query?.startDate);
  if (startDateRaw === undefined) {
    return { error: 'startDate is invalid' };
  }

  const endDateRaw = parseFilterDate(query?.endDate);
  if (endDateRaw === undefined) {
    return { error: 'endDate is invalid' };
  }

  const hasStart = Boolean(startDateRaw);
  const hasEnd = Boolean(endDateRaw);

  if (hasStart !== hasEnd) {
    return { error: 'Both startDate and endDate are required for a custom date range' };
  }

  const periodRaw = query?.period;
  const hasPeriod =
    periodRaw !== undefined && periodRaw !== null && String(periodRaw).trim() !== '';

  if (hasStart && hasEnd && hasPeriod) {
    return { error: 'Use either period or a custom date range, not both' };
  }

  if (hasStart && hasEnd) {
    const rangeStart = startOfDay(startDateRaw);
    const rangeEnd = endOfDay(endDateRaw);
    const todayEnd = endOfDay(new Date());

    if (rangeStart > rangeEnd) {
      return { error: 'startDate cannot be after endDate' };
    }

    if (rangeStart > todayEnd || rangeEnd > todayEnd) {
      return { error: 'startDate and endDate cannot be after today' };
    }

    return {
      rangeStart,
      rangeEnd,
      appliedFilters: {
        filterType: 'custom_range',
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      },
    };
  }

  if (!hasPeriod) {
    return {
      error:
        'Select a period (this_month, last_month, last_3_months, last_6_months, last_year) or provide startDate and endDate',
    };
  }

  const period = normalizeAnalyticsPeriod(periodRaw);
  if (!ANALYTICS_PERIOD_KEYS.has(period)) {
    return {
      error:
        'Invalid period. Use this_month, last_month, last_3_months, last_6_months, or last_year',
    };
  }

  const now = new Date();
  let rangeStart;
  let rangeEnd;

  switch (period) {
    case 'last_month': {
      const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      rangeStart = startOfDay(new Date(ref.getFullYear(), ref.getMonth(), 1));
      rangeEnd = endOfDay(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
      break;
    }
    case 'last_3_months':
      rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 2, 1));
      rangeEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
    case 'last_6_months':
      rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 5, 1));
      rangeEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
    case 'last_1_year':
      rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 11, 1));
      rangeEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
    case 'current_month':
    default: {
      const currentMonth = getCurrentMonthRange(now);
      rangeStart = currentMonth.monthStart;
      rangeEnd = currentMonth.monthEnd;
      break;
    }
  }

  return {
    rangeStart,
    rangeEnd,
    appliedFilters: {
      filterType: 'period',
      period,
    },
  };
}

async function aggregateCostTotals(shopId, branchId, rangeStart, rangeEnd) {
  const result = await CostExpense.aggregate([
    {
      $match: buildAnalyticsBranchFilter(shopId, branchId, {
        purchaseDate: { $gte: rangeStart, $lte: rangeEnd },
      }),
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        recordCount: { $sum: 1 },
      },
    },
  ]);

  return {
    totalAmount: roundMoney(result[0]?.totalAmount ?? 0),
    recordCount: result[0]?.recordCount ?? 0,
  };
}

async function aggregateSalesTotals(shopId, branchId, rangeStart, rangeEnd) {
  const result = await History.aggregate([
    {
      $match: buildAnalyticsBranchFilter(shopId, branchId, {
        status: 'submited',
        checkOutTime: { $gte: rangeStart, $lte: rangeEnd },
      }),
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$totalAmount' },
        recordCount: { $sum: 1 },
      },
    },
  ]);

  return {
    totalAmount: roundMoney(result[0]?.totalAmount ?? 0),
    recordCount: result[0]?.recordCount ?? 0,
  };
}

const getAnalyticsOverview = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const rangeResult = resolveAnalyticsDateRange(req.query);
    if (rangeResult.error) {
      return res.status(400).json({ success: false, message: rangeResult.error });
    }

    const { rangeStart, rangeEnd, appliedFilters } = rangeResult;

    const [costs, sales] = await Promise.all([
      aggregateCostTotals(shopId, branchId, rangeStart, rangeEnd),
      aggregateSalesTotals(shopId, branchId, rangeStart, rangeEnd),
    ]);

    const profit = calculateProfitMetrics(sales.totalAmount, costs.totalAmount);

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: {
        filters: appliedFilters,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        costs,
        sales,
        profit,
      },
      message: 'Analytics overview loaded',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAnalyticsOverview,
};
