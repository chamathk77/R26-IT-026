const { requestProductDemand } = require('../../services/analysisServiceClient');

/**
 * Product-level demand forecasting is fully owned by the Python analysis
 * backend (reuses the same Holt-Winters engine as novelty01, at daily/weekly
 * granularity) — there is no JS fallback. If the analysis backend is
 * unreachable, this rejects and the controller's catch-all returns a 500.
 */
async function computeProductDemandViaMl(products, horizonDays) {
  const result = await requestProductDemand({ products, horizonDays });
  return { ...result, poweredBy: 'python' };
}

module.exports = { computeProductDemandViaMl };
