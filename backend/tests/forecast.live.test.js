/**
 * TC-A5: Node <-> Python contract against the real analysis service.
 * Skipped unless ANALYSIS_LIVE=1 (start it first: uvicorn app.main:app --port 8000).
 */
const { forecastSeriesViaMl } = require('../src/novelty/novelty01Forecasting/forecastSeriesViaMl');

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
