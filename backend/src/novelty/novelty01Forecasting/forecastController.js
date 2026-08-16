const { forecastSeries, MIN_POINTS_FOR_SEASONAL } = require('./forecastEngine');
const {
  getMonthlySeries,
  addMonths,
  monthKey,
  monthLabel,
} = require('./forecastDataService');

const FORECAST_MONTHS = 12;
const HORIZONS = [
  { key: 'next_month', label: 'Next month', monthCount: 1 },
  { key: 'next_3_months', label: 'Next 3 months', monthCount: 3 },
  { key: 'next_6_months', label: 'Next 6 months', monthCount: 6 },
  { key: 'next_12_months', label: 'Next 1 year', monthCount: 12 },
];

function normalizeId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function requireShopAndBranchId(req, res) {
  const shopId = normalizeId(req.user?.shopId);
  if (!shopId) {
    res.status(400).json({ success: false, message: 'Shop id is required' });
    return null;
  }

  const branchId = normalizeId(req.user?.branchId);
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

function round2(value) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}

function sumField(points, field) {
  return points.reduce((total, point) => total + point[field], 0);
}

/**
 * Aggregates the per-month predictions into one horizon bucket. Interval
 * bounds are summed as-is, which is deliberately conservative: it assumes
 * errors in consecutive months could line up rather than cancel out.
 */
function buildHorizonSummary(horizon, salesPoints, costPoints) {
  const sales = salesPoints.slice(0, horizon.monthCount);
  const costs = costPoints.slice(0, horizon.monthCount);

  if (!sales.length || !costs.length) return null;

  const salesTotal = round2(sumField(sales, 'predicted'));
  const costsTotal = round2(sumField(costs, 'predicted'));
  const profit = round2(salesTotal - costsTotal);

  return {
    key: horizon.key,
    label: horizon.label,
    monthCount: horizon.monthCount,
    startMonth: sales[0].month,
    endMonth: sales[sales.length - 1].month,
    startLabel: sales[0].label,
    endLabel: sales[sales.length - 1].label,
    sales: {
      predicted: salesTotal,
      lower: round2(sumField(sales, 'lower')),
      upper: round2(sumField(sales, 'upper')),
    },
    costs: {
      predicted: costsTotal,
      lower: round2(sumField(costs, 'lower')),
      upper: round2(sumField(costs, 'upper')),
    },
    profit: {
      predicted: profit,
      margin: salesTotal > 0 ? round2((profit / salesTotal) * 100) : 0,
    },
    monthlyAverage: {
      sales: round2(salesTotal / horizon.monthCount),
      costs: round2(costsTotal / horizon.monthCount),
      profit: round2(profit / horizon.monthCount),
    },
  };
}

function attachMonthLabels(points, lastCompleteMonth) {
  const [year, month] = lastCompleteMonth.split('-').map(Number);

  return points.map((point, index) => {
    const next = addMonths(year, month, index + 1);
    const key = monthKey(next.year, next.month);
    return { ...point, month: key, label: monthLabel(key) };
  });
}

function describeDataQuality(completeMonths, method) {
  const monthsOfHistory = completeMonths.length;

  if (monthsOfHistory === 0) {
    return {
      monthsOfHistory,
      level: 'none',
      seasonalModelUsed: false,
      message:
        'No completed months of sales history yet. Record sales for at least 3 months to generate a forecast.',
    };
  }

  if (monthsOfHistory < 3) {
    return {
      monthsOfHistory,
      level: 'insufficient',
      seasonalModelUsed: false,
      message: `Only ${monthsOfHistory} complete month(s) of history. At least 3 are needed before a forecast can be produced.`,
    };
  }

  if (monthsOfHistory < MIN_POINTS_FOR_SEASONAL) {
    return {
      monthsOfHistory,
      level: 'limited',
      seasonalModelUsed: false,
      message: `Based on ${monthsOfHistory} months of history. Seasonal patterns need ${MIN_POINTS_FOR_SEASONAL} months, so longer horizons are less reliable.`,
    };
  }

  return {
    monthsOfHistory,
    level: 'good',
    seasonalModelUsed: method.startsWith('holt_winters'),
    message: `Based on ${monthsOfHistory} complete months of history, including seasonal patterns.`,
  };
}

function emptyForecastResponse(series, quality) {
  return {
    generatedAt: new Date().toISOString(),
    history: {
      months: series.months,
      completeMonths: series.months.filter((row) => !row.partial).length,
    },
    currentMonth: null,
    forecast: { months: [], horizons: [] },
    models: null,
    dataQuality: quality,
  };
}

const getSalesCostForecast = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const series = await getMonthlySeries(shopId, branchId);
    const completeMonths = series.months.filter((row) => !row.partial);
    const partialMonth = series.months.find((row) => row.partial) ?? null;

    if (completeMonths.length < 3) {
      const quality = describeDataQuality(completeMonths, 'insufficient_data');
      return res.status(200).json({
        success: true,
        shopId,
        branchId,
        data: emptyForecastResponse(series, quality),
        message: quality.message,
      });
    }

    const salesSeries = completeMonths.map((row) => row.sales);
    const costSeries = completeMonths.map((row) => row.costs);

    const salesModel = forecastSeries(salesSeries, FORECAST_MONTHS + 1);
    const costModel = forecastSeries(costSeries, FORECAST_MONTHS + 1);

    const lastCompleteMonth = completeMonths[completeMonths.length - 1].month;
    const salesPoints = attachMonthLabels(salesModel.points, lastCompleteMonth);
    const costPoints = attachMonthLabels(costModel.points, lastCompleteMonth);

    const currentMonthSales = salesPoints[0];
    const currentMonthCosts = costPoints[0];
    const futureSales = salesPoints.slice(1);
    const futureCosts = costPoints.slice(1);

    const forecastMonths = futureSales.map((point, index) => {
      const cost = futureCosts[index];
      return {
        month: point.month,
        label: point.label,
        sales: { predicted: point.predicted, lower: point.lower, upper: point.upper },
        costs: { predicted: cost.predicted, lower: cost.lower, upper: cost.upper },
        profit: { predicted: round2(point.predicted - cost.predicted) },
      };
    });

    const horizons = HORIZONS.map((horizon) =>
      buildHorizonSummary(horizon, futureSales, futureCosts),
    ).filter(Boolean);

    const currentMonth = partialMonth
      ? {
          month: partialMonth.month,
          label: partialMonth.label,
          actualSoFar: {
            sales: partialMonth.sales,
            costs: partialMonth.costs,
            profit: partialMonth.profit,
          },
          projectedTotal: {
            sales: currentMonthSales.predicted,
            costs: currentMonthCosts.predicted,
            profit: round2(currentMonthSales.predicted - currentMonthCosts.predicted),
          },
        }
      : null;

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: {
        generatedAt: new Date().toISOString(),
        history: {
          months: series.months,
          completeMonths: completeMonths.length,
        },
        currentMonth,
        forecast: { months: forecastMonths, horizons },
        models: {
          sales: {
            method: salesModel.method,
            params: salesModel.params,
            accuracy: salesModel.accuracy,
            backtest: salesModel.backtest,
          },
          costs: {
            method: costModel.method,
            params: costModel.params,
            accuracy: costModel.accuracy,
            backtest: costModel.backtest,
          },
        },
        dataQuality: describeDataQuality(completeMonths, salesModel.method),
      },
      message: 'Sales and cost forecast generated',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSalesCostForecast,
};
