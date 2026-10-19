/**
 * Novelty 1 (sales/cost forecasting) — Node side. Test IDs match Table 5.3 of the thesis.
 *
 * The real protect middleware, controller and route run; the User model, the MongoDB
 * aggregation and the Python analysis service are replaced with in-memory fakes so the
 * tests need neither a database nor the analysis backend.
 */
process.env.JWT_SECRET = 'forecast-test-secret';

const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const mockUsers = new Map();

jest.mock('../src/models/user', () => ({
  findById: jest.fn((id) => ({
    select: () => ({ lean: async () => mockUsers.get(String(id)) ?? null }),
  })),
  findByIdAndUpdate: jest.fn(async () => null),
}));

jest.mock('../src/novelty/novelty01Forecasting/forecastDataService', () => ({
  ...jest.requireActual('../src/novelty/novelty01Forecasting/forecastDataService'),
  getMonthlySeries: jest.fn(),
}));

jest.mock('../src/services/analysisServiceClient', () => ({
  requestForecast: jest.fn(),
  requestSalesCostForecast: jest.fn(),
}));

const {
  addMonths,
  monthKey,
  monthLabel,
  getMonthlySeries,
} = require('../src/novelty/novelty01Forecasting/forecastDataService');
const { requestSalesCostForecast } = require('../src/services/analysisServiceClient');
const {
  prepareTrainingSeries,
  computeWeekdayWeights,
  computePacing,
} = require('../src/novelty/novelty01Forecasting/forecastDataQuality');
const { buildInsights } = require('../src/novelty/novelty01Forecasting/forecastInsights');
const forecastRoutes = require('../src/novelty/novelty01Forecasting/forecastRoutes');

const app = express();
app.use(express.json());
app.use('/api/forecast', forecastRoutes);

function tokenFor(id, claims) {
  const token = jwt.sign({ id, ...claims }, process.env.JWT_SECRET);
  mockUsers.set(id, { token, shopId: claims.shopId });
  return token;
}

const branchToken = tokenFor('user-with-branch', { shopId: 'SI000001', branchId: 'B00001' });
const noBranchToken = tokenFor('user-without-branch', { shopId: 'SI000001' });

/** `complete` finished months starting Jan 2024 (sales 1000, costs 400), plus a partial current month. */
function monthlySeries(complete, { partial = true } = {}) {
  const months = [];
  const total = complete + (partial ? 1 : 0);
  for (let i = 0; i < total; i += 1) {
    const { year, month } = addMonths(2024, 1, i);
    const key = monthKey(year, month);
    const isPartial = partial && i === complete;
    months.push({
      month: key,
      label: monthLabel(key),
      sales: isPartial ? 300 : 1000,
      costs: isPartial ? 150 : 400,
      profit: isPartial ? 150 : 600,
      orderCount: 10,
      expenseCount: 2,
      activeDays: isPartial ? 5 : 26,
      partial: isPartial,
    });
  }
  return { months, timezone: 'Asia/Colombo' };
}

/**
 * Stand-in for POST /forecast/sales-cost: flat forecast at each series' last
 * value with a fixed standard deviation (sales 50, costs 20, profit 40).
 */
function fakePython({ sales, costs, horizon }) {
  const flat = (level, sigma) =>
    Array.from({ length: horizon }, () => ({
      predicted: level,
      lower: level - 1.96 * sigma,
      upper: level + 1.96 * sigma,
      sigma,
    }));
  const model = (series, sigma) => ({
    method: series.length >= 24 ? 'holt_winters_additive_damped' : 'seasonal_naive',
    params: {},
    points: flat(series[series.length - 1], sigma),
    accuracy: null,
    backtest: null,
    selection: { strategy: 'backtest', defaultMethod: 'seasonal_naive', folds: 6, candidates: [] },
    calendarAdjusted: false,
    intervalMethod: 'empirical',
  });
  const profitLevel = sales[sales.length - 1] - costs[costs.length - 1];
  return Promise.resolve({
    sales: model(sales, 50),
    costs: model(costs, 20),
    profit: {
      points: flat(profitLevel, 40).map((point) => ({ ...point, lossProbability: 0 })),
      errorCorrelation: 0.5,
    },
    breakEven: {
      available: true,
      months: 12,
      fixedCosts: 250,
      variableCostRate: 0.15,
      contributionMargin: 0.85,
      breakEvenSales: 294.12,
      r2: 0.9,
    },
    calendar: { weekdayWeights: null, futureIndex: null },
  });
}

function getForecast(token = branchToken) {
  const req = request(app).get('/api/forecast/sales-cost');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
}

beforeEach(() => {
  jest.clearAllMocks();
  requestSalesCostForecast.mockImplementation(fakePython);
});

describe('TC-N1 month arithmetic', () => {
  test.each([
    [2026, 12, 1, { year: 2027, month: 1 }],
    [2026, 1, -1, { year: 2025, month: 12 }],
    [2024, 3, 35, { year: 2027, month: 2 }],
  ])('addMonths(%i, %i, %i)', (year, month, offset, expected) => {
    expect(addMonths(year, month, offset)).toEqual(expected);
  });
});

describe('TC-N2 horizon summaries', () => {
  test('3-month totals are summed and ranges use the summed monthly SDs', async () => {
    getMonthlySeries.mockResolvedValue(monthlySeries(36));
    const res = await getForecast();
    const horizon = res.body.data.forecast.horizons.find((h) => h.key === 'next_3_months');

    // 3 x SD 50 = 150 -> +/- 1.96 x 150 = 294
    expect(horizon.sales).toEqual({ predicted: 3000, lower: 2706, upper: 3294 });
    expect(horizon.costs).toEqual({ predicted: 1200, lower: 1082.4, upper: 1317.6 });
    expect(horizon.profit).toMatchObject({ predicted: 1800, margin: 60, lower: 1564.8, upper: 2035.2 });
    expect(horizon.profit.lossProbability).toBeLessThan(0.0001);
    expect(horizon.monthlyAverage).toEqual({ sales: 1000, costs: 400, profit: 600 });
  });

  test('a total near zero profit carries a real chance of loss', async () => {
    getMonthlySeries.mockResolvedValue(monthlySeries(36));
    requestSalesCostForecast.mockImplementation(async (payload) => {
      const result = await fakePython(payload);
      result.profit.points = result.profit.points.map((point) => ({ ...point, predicted: 0 }));
      result.costs.points = result.costs.points.map((point) => ({ ...point, predicted: 1000 }));
      return result;
    });
    const res = await getForecast();
    const next = res.body.data.forecast.horizons.find((h) => h.key === 'next_month');
    expect(next.profit.predicted).toBe(0);
    expect(next.profit.lossProbability).toBeCloseTo(0.5, 4);
  });
});

describe('TC-N3 data-quality levels', () => {
  test.each([
    [0, 'none', false],
    [2, 'insufficient', false],
    [3, 'limited', true],
    [23, 'limited', true],
    [24, 'good', true],
  ])('%i complete months -> %s', async (complete, level, callsPython) => {
    getMonthlySeries.mockResolvedValue(
      complete === 0 ? { months: [], timezone: 'Asia/Colombo' } : monthlySeries(complete),
    );
    const res = await getForecast();

    expect(res.status).toBe(200);
    expect(res.body.data.dataQuality.level).toBe(level);
    expect(res.body.data.dataQuality.monthsOfHistory).toBe(complete);
    expect(requestSalesCostForecast).toHaveBeenCalledTimes(callsPython ? 1 : 0);
    if (level === 'good') expect(res.body.data.dataQuality.seasonalModelUsed).toBe(true);
  });
});

describe('API behaviour', () => {
  test('TC-A1 request without a token is rejected with 401', async () => {
    const res = await getForecast(null);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NO_TOKEN');
    expect(getMonthlySeries).not.toHaveBeenCalled();
  });

  test('TC-A2 token without a branch is rejected with 400 BRANCH_REQUIRED', async () => {
    const res = await getForecast(noBranchToken);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BRANCH_REQUIRED');
    expect(getMonthlySeries).not.toHaveBeenCalled();
  });

  test('TC-A3 36 months of history returns the full forecast', async () => {
    getMonthlySeries.mockResolvedValue(monthlySeries(36));
    const res = await getForecast();
    const { data } = res.body;

    expect(res.status).toBe(200);
    expect(getMonthlySeries).toHaveBeenCalledWith('SI000001', 'B00001');

    // One call with both series, partial month excluded, horizon 13 (current month + 12).
    expect(requestSalesCostForecast).toHaveBeenCalledTimes(1);
    const [payload] = requestSalesCostForecast.mock.calls[0];
    expect(payload.sales).toHaveLength(36);
    expect(payload.costs).toHaveLength(36);
    expect(payload.months).toHaveLength(36);
    expect(payload.months[0]).toBe('2024-01');
    expect(payload.horizon).toBe(13);
    expect(payload.seasonLength).toBe(12);

    expect(data.history.completeMonths).toBe(36);
    expect(data.currentMonth.month).toBe('2027-01');
    expect(data.currentMonth.actualSoFar).toEqual({ sales: 300, costs: 150, profit: 150 });
    expect(data.currentMonth.projectedTotal).toEqual({ sales: 1000, costs: 400, profit: 600 });
    expect(data.forecast.months).toHaveLength(12);
    expect(data.forecast.months[0].month).toBe('2027-02');
    expect(data.forecast.horizons.map((h) => h.monthCount)).toEqual([1, 3, 6, 12]);
    expect(data.models.sales.poweredBy).toBe('python');
    expect(data.models.sales.selection.strategy).toBe('backtest');
    expect(data.estimatedMonths).toEqual([]);
    expect(data.breakEven).toMatchObject({ available: true, breakEvenSales: 294.12, nextMonthSales: 1000 });
    expect(data.forecast.months[0].profit).toMatchObject({ predicted: 600, lossProbability: 0 });
    expect(data.insights.map((item) => item.key)).toEqual(
      expect.arrayContaining(['trend', 'seasonality', 'break_even', 'break_even_next_month']),
    );
  });

  test('TC-A4 analysis service unavailable returns 500 without crashing', async () => {
    getMonthlySeries.mockResolvedValue(monthlySeries(36));
    requestSalesCostForecast.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8000'));
    const res = await getForecast();

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/ECONNREFUSED/);
  });
});

describe('TC-N4 incompletely recorded months', () => {
  test('a half-recorded final month and a test-order month are left out and estimated', async () => {
    const series = monthlySeries(31);
    const complete = series.months.filter((row) => !row.partial);
    Object.assign(complete[29], { sales: 600, orderCount: 6, activeDays: 12 }); // half recorded
    Object.assign(complete[30], { sales: 30, orderCount: 3, activeDays: 1 }); // 3 test orders
    getMonthlySeries.mockResolvedValue(series);

    const res = await getForecast();
    const { data } = res.body;
    const [payload] = requestSalesCostForecast.mock.calls[0];

    expect(payload.sales).toHaveLength(29);
    expect(payload.sales.every((value) => value === 1000)).toBe(true);
    expect(payload.horizon).toBe(15); // 2 estimated months + current month + 12
    expect(data.estimatedMonths.map((m) => m.month)).toEqual([complete[29].month, complete[30].month]);
    expect(data.estimatedMonths[1].recorded.sales).toBe(30);
    expect(data.currentMonth.month).toBe(series.months[31].month);
    expect(data.forecast.months[0].month).toBe(
      monthKey(...Object.values(addMonths(...series.months[31].month.split('-').map(Number), 1))),
    );
    expect(data.dataQuality.excludedMonths).toHaveLength(2);
    expect(data.dataQuality.message).toMatch(/left out and estimated/);
  });

  test('a gap in the middle is filled from its neighbours, not trimmed', () => {
    const complete = monthlySeries(12, { partial: false }).months;
    complete.forEach((row, index) => Object.assign(row, { sales: 1000 + 100 * index }));
    Object.assign(complete[5], { sales: 0, orderCount: 0, activeDays: 0 });
    Object.assign(complete[7], { expenseCount: 0, costs: 0 });

    const prepared = prepareTrainingSeries(complete);
    expect(prepared.months).toHaveLength(12);
    expect(prepared.sales[5]).toBe(1500);
    expect(prepared.costs[7]).toBe(400);
    expect(prepared.imputed).toEqual([
      { month: complete[5].month, label: complete[5].label, series: 'sales' },
      { month: complete[7].month, label: complete[7].label, series: 'costs' },
    ]);
    expect(prepared.excludedHead).toEqual([]);
    expect(prepared.excludedTail).toEqual([]);
  });

  test('fewer than 4 months are never flagged', () => {
    const complete = monthlySeries(3, { partial: false }).months;
    complete[2].orderCount = 1;
    expect(prepareTrainingSeries(complete).issues).toEqual([]);
  });
});

describe('TC-N5 weekday profile and month pacing', () => {
  // Saturdays sell 300, every other day 100, Mar-Apr 2026.
  const daily = [];
  for (let day = new Date(Date.UTC(2026, 2, 1)); day < new Date(Date.UTC(2026, 4, 1)); day.setUTCDate(day.getUTCDate() + 1)) {
    daily.push({ date: day.toISOString().slice(0, 10), sales: day.getUTCDay() === 6 ? 300 : 100, orders: 5 });
  }

  test('weights are relative to an average day, Monday first', () => {
    const weights = computeWeekdayWeights(daily, ['2026-03', '2026-04']);
    expect(weights).toHaveLength(7);
    expect(weights[5]).toBeCloseTo(300 / (900 / 7), 3); // Saturday
    expect(weights[0]).toBeCloseTo(100 / (900 / 7), 3);
    expect(computeWeekdayWeights(daily, ['2026-03'])).toBeNull(); // under 8 weeks
  });

  test('pacing compares sales to yesterday with the weekday-weighted expected share', () => {
    const weights = computeWeekdayWeights(daily, ['2026-03', '2026-04']);
    const pacing = computePacing({
      daily,
      monthKey: '2026-04',
      today: '2026-04-11',
      projectedSales: 3800,
      weekdayWeights: weights,
    });
    // Apr 1-10 2026: one Saturday (4th) -> 1200 recorded; month: 26 x 100 + 4 Saturdays x 300 = 3800.
    expect(pacing.salesSoFar).toBe(1200);
    expect(pacing.expectedShare).toBeCloseTo(1200 / 3800, 3);
    expect(pacing.status).toBe('on_track');
    expect(computePacing({ daily, monthKey: '2026-04', today: '2026-04-02', projectedSales: 3800 }).status).toBe(
      'too_early',
    );
    expect(
      computePacing({ daily, monthKey: '2026-04', today: '2026-04-11', projectedSales: 6000, weekdayWeights: weights })
        .status,
    ).toBe('behind');
  });
});

describe('TC-N6 plain-language insights', () => {
  test('loss risk and break-even shortfall are flagged as warnings', () => {
    const month = (label, sales, lossProbability) => ({
      label,
      sales: { predicted: sales },
      profit: { predicted: 0, lossProbability },
    });
    const insights = buildInsights({
      monthKeys: ['2026-01', '2026-02', '2026-03'],
      sales: [100, 100, 100],
      weekdayWeights: [0.1, 1, 1, 1, 1, 1.5, 1.4],
      breakEven: { available: true, breakEvenSales: 1000, fixedCosts: 800, variableCostRate: 0.2 },
      forecastMonths: [month('May 2026', 900, 0.35), month('Jun 2026', 1100, 0.1)],
    });
    const byKey = Object.fromEntries(insights.map((item) => [item.key, item]));

    expect(byKey.weekday.text).toMatch(/^Saturday is your strongest day .*you rarely sell on Mondays/);
    expect(byKey.break_even_next_month).toMatchObject({ tone: 'warning' });
    expect(byKey.break_even_next_month.text).toMatch(/10% below/);
    expect(byKey.loss_risk).toMatchObject({ tone: 'warning' });
    expect(byKey.loss_risk.text).toMatch(/35% chance of a loss in May 2026/);
    expect(byKey.trend).toBeUndefined(); // under 6 months
  });
});
