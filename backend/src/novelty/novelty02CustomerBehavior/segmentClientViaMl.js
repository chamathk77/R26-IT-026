const { requestCustomerSegments } = require('../../services/analysisServiceClient');

/**
 * RFM customer segmentation is fully owned by the Python analysis backend
 * (scikit-learn KMeans on standardized RFM features) — there is no JS
 * fallback. If the analysis backend is unreachable, this rejects and the
 * controller's catch-all returns a 500.
 */
async function computeCustomerSegmentsViaMl(customers, options = {}) {
  const k = options.segmentCount ?? 4;
  const now = (options.now ?? new Date()).toISOString();

  const result = await requestCustomerSegments({ customers, k, now });
  return { ...result, poweredBy: 'python' };
}

module.exports = { computeCustomerSegmentsViaMl };
