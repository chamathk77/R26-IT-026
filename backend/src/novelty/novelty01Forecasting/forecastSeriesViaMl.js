const { requestForecast } = require('../../services/analysisServiceClient');

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

module.exports = { forecastSeriesViaMl };
