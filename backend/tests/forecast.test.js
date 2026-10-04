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
}));

const {
  addMonths,
  monthKey,
  monthLabel,
  getMonthlySeries,
} = require('../src/novelty/novelty01Forecasting/forecastDataService');
const { requestForecast } = require('../src/services/analysisServiceClient');
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
      partial: isPartial,
    });
  }
  return { months, timezone: 'Asia/Colombo' };
}

/** Stand-in for POST /forecast: flat forecast at the series' last value, ±10% range. */
function fakePython({ series, horizon }) {
  const level = series[series.length - 1];
  return Promise.resolve({
    method: series.length >= 24 ? 'holt_winters_additive_damped' : 'holt_linear_damped',
    params: {},
    points: Array.from({ length: horizon }, () => ({
      predicted: level,
      lower: level * 0.9,
      upper: level * 1.1,
    })),
    accuracy: null,
    backtest: null,
  });
}

function getForecast(token = branchToken) {
  const req = request(app).get('/api/forecast/sales-cost');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
}

beforeEach(() => {
  jest.clearAllMocks();
  requestForecast.mockImplementation(fakePython);
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
  test('3-month totals and bounds are the sums of the monthly values', async () => {
    getMonthlySeries.mockResolvedValue(monthlySeries(36));
    const res = await getForecast();
    const horizon = res.body.data.forecast.horizons.find((h) => h.key === 'next_3_months');

    expect(horizon.sales).toEqual({ predicted: 3000, lower: 2700, upper: 3300 });
    expect(horizon.costs).toEqual({ predicted: 1200, lower: 1080, upper: 1320 });
    expect(horizon.profit).toEqual({ predicted: 1800, margin: 60 });
    expect(horizon.monthlyAverage).toEqual({ sales: 1000, costs: 400, profit: 600 });
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
    expect(requestForecast).toHaveBeenCalledTimes(callsPython ? 2 : 0);
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

    // Both series are sent once each, partial month excluded, horizon 13 (current month + 12).
    expect(requestForecast).toHaveBeenCalledTimes(2);
    for (const [payload] of requestForecast.mock.calls) {
      expect(payload.series).toHaveLength(36);
      expect(payload.horizon).toBe(13);
      expect(payload.seasonLength).toBe(12);
    }

    expect(data.history.completeMonths).toBe(36);
    expect(data.currentMonth.month).toBe('2027-01');
    expect(data.currentMonth.actualSoFar).toEqual({ sales: 300, costs: 150, profit: 150 });
    expect(data.currentMonth.projectedTotal).toEqual({ sales: 1000, costs: 400, profit: 600 });
    expect(data.forecast.months).toHaveLength(12);
    expect(data.forecast.months[0].month).toBe('2027-02');
    expect(data.forecast.horizons.map((h) => h.monthCount)).toEqual([1, 3, 6, 12]);
    expect(data.models.sales.poweredBy).toBe('python');
  });

  test('TC-A4 analysis service unavailable returns 500 without crashing', async () => {
    getMonthlySeries.mockResolvedValue(monthlySeries(36));
    requestForecast.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8000'));
    const res = await getForecast();

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/ECONNREFUSED/);
  });
});
