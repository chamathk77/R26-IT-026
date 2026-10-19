const { forecastSalesCostsViaMl } = require('./forecastSeriesViaMl');
const {
  getMonthlySeries,
  addMonths,
  monthKey,
  monthLabel,
} = require('./forecastDataService');
const {
  prepareTrainingSeries,
  computeWeekdayWeights,
  computePacing,
} = require('./forecastDataQuality');
const { buildInsights } = require('./forecastInsights');

const FORECAST_MONTHS = 12;
// Two full 12-month seasons — the point at which the analysis backend's
// Holt-Winters model switches on seasonal decomposition instead of a
// simpler trend-only fit.
const MIN_POINTS_FOR_SEASONAL = 24;
const Z95 = 1.96;
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

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, error < 1.5e-7). */
function normalCdf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * Range of a multi-month total. The monthly standard deviations are added
 * rather than combined in quadrature, which assumes errors in consecutive
 * months line up instead of cancelling out: deliberately conservative.
 */
function totalRange(points, { clipAtZero }) {
  const predicted = sumField(points, 'predicted');
  const sigma = sumField(points, 'sigma');
  const lower = predicted - Z95 * sigma;
  return {
    predicted: round2(predicted),
    lower: round2(clipAtZero ? Math.max(0, lower) : lower),
    upper: round2(predicted + Z95 * sigma),
    sigma,
  };
}

function buildHorizonSummary(horizon, salesPoints, costPoints, profitPoints) {
  const sales = salesPoints.slice(0, horizon.monthCount);
  const costs = costPoints.slice(0, horizon.monthCount);
  const profits = profitPoints.slice(0, horizon.monthCount);

  if (!sales.length || !costs.length) return null;

  const salesTotal = totalRange(sales, { clipAtZero: true });
  const costsTotal = totalRange(costs, { clipAtZero: true });
  const profitTotal = totalRange(profits, { clipAtZero: false });
  const profit = round2(salesTotal.predicted - costsTotal.predicted);
  const lossProbability =
    profitTotal.sigma > 0 ? normalCdf(-profit / profitTotal.sigma) : Number(profit < 0);

  return {
    key: horizon.key,
    label: horizon.label,
    monthCount: horizon.monthCount,
    startMonth: sales[0].month,
    endMonth: sales[sales.length - 1].month,
    startLabel: sales[0].label,
    endLabel: sales[sales.length - 1].label,
    sales: { predicted: salesTotal.predicted, lower: salesTotal.lower, upper: salesTotal.upper },
    costs: { predicted: costsTotal.predicted, lower: costsTotal.lower, upper: costsTotal.upper },
    profit: {
      predicted: profit,
      margin: salesTotal.predicted > 0 ? round2((profit / salesTotal.predicted) * 100) : 0,
      lower: profitTotal.lower,
      upper: profitTotal.upper,
      lossProbability: Number(lossProbability.toFixed(4)),
    },
    monthlyAverage: {
      sales: round2(salesTotal.predicted / horizon.monthCount),
      costs: round2(costsTotal.predicted / horizon.monthCount),
      profit: round2(profit / horizon.monthCount),
    },
  };
}

function monthsBetween(fromKey, toKey) {
  const [fromYear, fromMonth] = fromKey.split('-').map(Number);
  const [toYear, toMonth] = toKey.split('-').map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

function attachMonthLabels(points, lastCompleteMonth) {
  const [year, month] = lastCompleteMonth.split('-').map(Number);

  return points.map((point, index) => {
    const next = addMonths(year, month, index + 1);
    const key = monthKey(next.year, next.month);
    return { ...point, month: key, label: monthLabel(key) };
  });
}

function listLabels(labels) {
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/**
 * `prepared` is the output of prepareTrainingSeries (or null when there is
 * not enough history to check); `monthsOfHistory` counts the months the
 * model actually learns from.
 */
function describeDataQuality(completeMonths, method, prepared = null) {
  const usable = prepared ? prepared.months.length : completeMonths.length;
  const labelOf = (key) => completeMonths.find((row) => row.month === key)?.label ?? key;
  const excludedMonths = prepared
    ? [...prepared.excludedHead, ...prepared.excludedTail].map((key) => ({ month: key, label: labelOf(key) }))
    : [];
  const imputedMonths = prepared?.imputed ?? [];

  const notes = [];
  if (prepared?.excludedTail.length) {
    notes.push(
      `${listLabels(prepared.excludedTail.map(labelOf))} look${prepared.excludedTail.length === 1 ? 's' : ''} incompletely recorded, so ${prepared.excludedTail.length === 1 ? 'it was' : 'they were'} left out and estimated instead.`,
    );
  }
  if (prepared?.excludedHead.length) {
    notes.push(
      `${listLabels(prepared.excludedHead.map(labelOf))} (before regular recording started) ${prepared.excludedHead.length === 1 ? 'was' : 'were'} left out.`,
    );
  }
  if (imputedMonths.length) {
    const labels = [...new Set(imputedMonths.map((item) => item.label))];
    notes.push(
      `${listLabels(labels)} had unusually few records and ${labels.length === 1 ? 'was' : 'were'} filled in from the neighbouring months.`,
    );
  }

  const base = {
    monthsOfHistory: usable,
    seasonalModelUsed: false,
    issues: prepared?.issues ?? [],
    excludedMonths,
    imputedMonths,
  };
  const withNotes = (message) => [message, ...notes].join(' ');

  if (completeMonths.length === 0) {
    return {
      ...base,
      level: 'none',
      message:
        'No completed months of sales history yet. Record sales for at least 3 months to generate a forecast.',
    };
  }

  if (usable < 3) {
    return {
      ...base,
      level: 'insufficient',
      message: withNotes(
        `Only ${usable} usable complete month(s) of history. At least 3 are needed before a forecast can be produced.`,
      ),
    };
  }

  if (usable < MIN_POINTS_FOR_SEASONAL) {
    return {
      ...base,
      level: 'limited',
      message: withNotes(
        `Based on ${usable} months of history. Seasonal patterns need ${MIN_POINTS_FOR_SEASONAL} months, so longer horizons are less reliable.`,
      ),
    };
  }

  return {
    ...base,
    level: notes.length ? 'limited' : 'good',
    seasonalModelUsed: method.startsWith('holt_winters') || method === 'seasonal_naive',
    message: withNotes(`Based on ${usable} complete months of history, including seasonal patterns.`),
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
    estimatedMonths: [],
    forecast: { months: [], horizons: [] },
    models: null,
    breakEven: null,
    calendar: { weekdayWeights: null },
    insights: [],
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
    const prepared = prepareTrainingSeries(completeMonths);

    if (prepared.months.length < 3) {
      const quality = describeDataQuality(completeMonths, 'insufficient_data', prepared);
      return res.status(200).json({
        success: true,
        shopId,
        branchId,
        data: emptyForecastResponse(series, quality),
        message: quality.message,
      });
    }

    const trainingKeys = prepared.months.map((row) => row.month);
    const imputedSalesMonths = new Set(
      prepared.imputed.filter((item) => item.series === 'sales').map((item) => item.month),
    );
    const weekdayWeights = series.daily
      ? computeWeekdayWeights(
          series.daily,
          trainingKeys.filter((key) => !imputedSalesMonths.has(key)),
        )
      : null;

    const lastTrainingMonth = trainingKeys[trainingKeys.length - 1];
    const [lastYear, lastMonth] = lastTrainingMonth.split('-').map(Number);
    const fallbackCurrent = addMonths(lastYear, lastMonth, 1);
    const currentKey =
      series.today?.slice(0, 7) ??
      partialMonth?.month ??
      monthKey(fallbackCurrent.year, fallbackCurrent.month);
    // Months between the last month the model learned from and the current
    // month: normally 1, more when the latest months were left out as
    // incompletely recorded (the model then estimates them too).
    const gap = Math.max(1, monthsBetween(lastTrainingMonth, currentKey));

    const result = await forecastSalesCostsViaMl({
      sales: prepared.sales,
      costs: prepared.costs,
      months: trainingKeys,
      horizon: gap + FORECAST_MONTHS,
      weekdayWeights,
    });
    const salesModel = result.sales;
    const costModel = result.costs;

    const salesPoints = attachMonthLabels(salesModel.points, lastTrainingMonth);
    const costPoints = attachMonthLabels(costModel.points, lastTrainingMonth);
    const profitPoints = attachMonthLabels(result.profit.points, lastTrainingMonth);

    const estimatedMonths = salesPoints.slice(0, gap - 1).map((point, index) => {
      const recorded = completeMonths.find((row) => row.month === point.month);
      return {
        month: point.month,
        label: point.label,
        recorded: recorded ? { sales: recorded.sales, costs: recorded.costs } : null,
        estimated: { sales: point.predicted, costs: costPoints[index].predicted },
      };
    });

    const currentMonthSales = salesPoints[gap - 1];
    const currentMonthCosts = costPoints[gap - 1];
    const futureSales = salesPoints.slice(gap);
    const futureCosts = costPoints.slice(gap);
    const futureProfit = profitPoints.slice(gap);

    const forecastMonths = futureSales.map((point, index) => {
      const cost = futureCosts[index];
      const profit = futureProfit[index];
      return {
        month: point.month,
        label: point.label,
        sales: { predicted: point.predicted, lower: point.lower, upper: point.upper },
        costs: { predicted: cost.predicted, lower: cost.lower, upper: cost.upper },
        profit: {
          predicted: round2(point.predicted - cost.predicted),
          lower: profit.lower,
          upper: profit.upper,
          lossProbability: profit.lossProbability,
        },
      };
    });

    const horizons = HORIZONS.map((horizon) =>
      buildHorizonSummary(horizon, futureSales, futureCosts, futureProfit),
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
          pacing:
            series.daily && series.today
              ? computePacing({
                  daily: series.daily,
                  monthKey: partialMonth.month,
                  today: series.today,
                  projectedSales: currentMonthSales.predicted,
                  weekdayWeights,
                })
              : null,
        }
      : null;

    const breakEven = result.breakEven?.available
      ? {
          ...result.breakEven,
          nextMonthSales: forecastMonths[0]?.sales.predicted ?? null,
        }
      : result.breakEven ?? null;

    const describeModel = (model) => ({
      method: model.method,
      params: model.params,
      accuracy: model.accuracy,
      backtest: model.backtest,
      selection: model.selection ?? null,
      calendarAdjusted: Boolean(model.calendarAdjusted),
      intervalMethod: model.intervalMethod ?? null,
      poweredBy: model.poweredBy,
    });

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
        estimatedMonths,
        forecast: { months: forecastMonths, horizons },
        models: {
          sales: describeModel(salesModel),
          costs: describeModel(costModel),
          profitErrorCorrelation: result.profit.errorCorrelation,
        },
        breakEven,
        calendar: { weekdayWeights },
        insights: buildInsights({
          monthKeys: trainingKeys,
          sales: prepared.sales,
          weekdayWeights,
          breakEven,
          forecastMonths,
        }),
        dataQuality: describeDataQuality(completeMonths, salesModel.method, prepared),
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
