/**
 * TC-A5: Node <-> Python contract against the real analysis service.
 * Skipped unless ANALYSIS_LIVE=1 (start it first: uvicorn app.main:app --port 8000).
 */
const {
  forecastSeriesViaMl,
  forecastSalesCostsViaMl,
} = require('../src/novelty/novelty01Forecasting/forecastSeriesViaMl');

const live = process.env.ANALYSIS_LIVE === '1' ? describe : describe.skip;

const MONTH_SEASONALITY = [0.88, 0.9, 0.97, 1.18, 1.0, 0.92, 1.02, 1.1, 0.95, 0.98, 1.05, 1.28];
const series = Array.from({ length: 35 }, (_, i) => 2400000 * 1.006 ** i * MONTH_SEASONALITY[i % 12]);

live('TC-A5 live analysis service', () => {
  test('35 months returns a seasonal forecast in the shape the controller expects', async () => {
    const started = Date.now();
    const result = await forecastSeriesViaMl(series, 13);
    const elapsedMs = Date.now() - started;

    expect(result.poweredBy).toBe('python');
    expect(result.method).toBe('holt_winters_additive_damped');
    expect(result.points).toHaveLength(13);
    for (const point of result.points) {
      expect(point.lower).toBeLessThanOrEqual(point.predicted);
      expect(point.predicted).toBeLessThanOrEqual(point.upper);
    }
    expect(result.backtest.holdoutMonths).toBe(6);
    expect(elapsedMs).toBeLessThan(2000);
  });
});

live('TC-A6 live adaptive sales/cost endpoint', () => {
  test('35 months returns sales, costs, profit risk and break-even in one call', async () => {
    const months = Array.from({ length: 35 }, (_, i) => {
      const year = 2023 + Math.floor(i / 12);
      return `${year}-${String((i % 12) + 1).padStart(2, '0')}`;
    });
    const costs = series.map((value) => 400000 + 0.32 * value);
    const started = Date.now();
    const result = await forecastSalesCostsViaMl({
      sales: series,
      costs,
      months,
      horizon: 13,
      weekdayWeights: [0.8, 0.8, 0.84, 0.94, 1.18, 1.33, 1.11],
    });
    const elapsedMs = Date.now() - started;

    expect(result.sales.poweredBy).toBe('python');
    expect(result.sales.points).toHaveLength(13);
    expect(result.profit.points).toHaveLength(13);
    for (const point of result.profit.points) {
      expect(point.lossProbability).toBeGreaterThanOrEqual(0);
      expect(point.lossProbability).toBeLessThanOrEqual(1);
    }
    expect(result.breakEven.available).toBe(true);
    expect(result.breakEven.variableCostRate).toBeCloseTo(0.32, 2);
    expect(elapsedMs).toBeLessThan(5000);
  });
});
