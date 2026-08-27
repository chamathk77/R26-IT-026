const { requestRecommendations } = require('../../services/analysisServiceClient');

/**
 * Basket-association mining is fully owned by the Python analysis backend
 * (Apriori rules + item-item collaborative filtering + a popularity prior) —
 * there is no JS fallback, and Node never re-scores or re-orders what comes
 * back. If the analysis backend is unreachable, this rejects and the
 * controller's catch-all returns a 500.
 */
async function computeRecommendationsViaMl(payload) {
  const result = await requestRecommendations(payload);
  return { ...result, poweredBy: 'python' };
}

module.exports = { computeRecommendationsViaMl };
