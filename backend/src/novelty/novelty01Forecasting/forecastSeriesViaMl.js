const { requestForecast, requestSalesCostForecast } = require('../../services/analysisServiceClient');

/**
 * Sales/cost forecasting is fully owned by the Python analysis backend
 * (statsmodels-fitted Holt-Winters) — there is no JS fallback. If the
 * analysis backend is unreachable, this rejects and the controller's
 * catch-all returns a 500.
 */
async function forecastSeriesViaMl(series, horizon, options = {}) {
  const seasonLength = options.seasonLength ?? 12;

  const result = await requestForecast({ series, horizon, seasonLength });
  return { ...result, poweredBy: 'python' };
}

/**
 * Adaptive sales + cost + profit forecast in one call (POST /forecast/sales-cost):
 * per-shop model choice, trading-day adjustment, ranges from past errors,
 * profit risk and break-even.
 */
async function forecastSalesCostsViaMl({ sales, costs, months, horizon, weekdayWeights }) {
  const result = await requestSalesCostForecast({
    sales,
    costs,
    months,
    horizon,
    seasonLength: 12,
    weekdayWeights: weekdayWeights ?? null,
  });
  return {
    ...result,
    sales: { ...result.sales, poweredBy: 'python' },
    costs: { ...result.costs, poweredBy: 'python' },
  };
}

module.exports = { forecastSeriesViaMl, forecastSalesCostsViaMl };
