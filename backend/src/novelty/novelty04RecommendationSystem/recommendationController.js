const {
  getOrderBaskets,
  getOrderableCatalog,
  getCustomerFavouriteProductIds,
} = require('./recommendationDataService');
const { computeRecommendationsViaMl } = require('./recommendationClientViaMl');

// Scores flatten out quickly, so the 7th-10th suggestions are about as good as
// the 6th — showing fewer just hides equivalent options behind nothing.
const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 1;
const MAX_LIMIT = 12;
/** The staff screen renders one sentence per rule; more than this is unreadable. */
const INSIGHTS_RULE_LIMIT = 20;

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

/** A public endpoint takes whatever the caller sends, so never trust `limit`. */
function clampLimit(value) {
  // An absent limit means "use the default", which is not the same as a limit
  // of 0 — Number(null) is 0 and would otherwise clamp down to a single card.
  if (value == null || value === '') return DEFAULT_LIMIT;

  const limit = Number(value);
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.trunc(limit)));
}

function toCandidate(entry) {
  return {
    productId: entry.productId,
    categoryId: entry.categoryId,
    categoryName: entry.categoryName,
  };
}

/**
 * The customer-facing sentence for each reasonCode Python can return. Kept in
 * Node because it is copy, not maths — Python decides WHY a product is being
 * suggested, Node only puts that into words the shopper understands.
 */
function buildReason(recommendation, entry, withEntry) {
  switch (recommendation.reasonCode) {
    case 'frequently_bought_together':
      return withEntry ? `Often ordered with ${withEntry.productName}` : 'Often ordered together';
    case 'similar_taste':
      return withEntry ? `Goes well with ${withEntry.productName}` : 'Goes well with your order';
    case 'popular_in_category':
      return entry.categoryName ? `Most loved ${entry.categoryName}` : 'Most loved pick';
    case 'popular_overall':
      return 'Popular right now';
    case 'personal_favourite':
      return 'You ordered this before';
    default:
      return 'Recommended for you';
  }
}

/**
 * Shared by the public cart endpoint and the staff insights endpoint: pull the
 * baskets, the orderable catalog and the caller's favourites, ask Python once,
 * then decorate the productIds it ranked. Node adds names and prices only —
 * the returned order is Python's order, untouched.
 */
async function buildCustomerRecommendations({ shopId, branchId, cartProductIds, phone, limit }) {
  const cartItemIds = [...new Set((cartProductIds ?? []).map((id) => String(id)))];
  const resolvedLimit = clampLimit(limit);

  const [baskets, catalog, favouriteIds] = await Promise.all([
    getOrderBaskets(shopId, branchId),
    getOrderableCatalog(shopId, branchId),
    getCustomerFavouriteProductIds(shopId, branchId, phone),
  ]);

  // Keyed on the WHOLE catalog, not just the candidates: `withProductId` points
  // at a cart item, which by definition was filtered out of the candidates.
  const catalogByProductId = new Map(catalog.map((entry) => [entry.productId, entry]));
  const cartSet = new Set(cartItemIds);

  const candidates = catalog
    .filter((entry) => !cartSet.has(entry.productId) && entry.available)
    .map(toCandidate);

  // Cart items are deliberately absent from `candidates`, so their categories have to be
  // sent separately — without this the model cannot tell which categories the customer
  // already covered and would happily pitch a second kottu to someone holding a kottu.
  const cartCategoryIds = [
    ...new Set(
      cartItemIds
        .map((productId) => catalogByProductId.get(productId)?.categoryId)
        .filter(Boolean)
        .map((categoryId) => String(categoryId)),
    ),
  ];

  const model = await computeRecommendationsViaMl({
    transactions: baskets.transactions,
    cartItemIds,
    cartCategoryIds,
    candidates,
    favouriteIds,
    limit: resolvedLimit,
  });

  const recommendations = [];
  for (const recommendation of model.recommendations ?? []) {
    const entry = catalogByProductId.get(String(recommendation.productId));
    // Defensive: the catalog can change between the two reads above.
    if (!entry) continue;

    const withEntry = recommendation.withProductId
      ? catalogByProductId.get(String(recommendation.withProductId))
      : null;

    recommendations.push({
      productId: entry.productId,
      productName: entry.productName,
      amount: entry.amount,
      image: entry.image,
      categoryName: entry.categoryName,
      qty: entry.qty,
      available: entry.available,
      reasonCode: recommendation.reasonCode,
      reason: buildReason(recommendation, entry, withEntry),
      score: recommendation.score,
      stats: {
        support: recommendation.support ?? null,
        confidence: recommendation.confidence ?? null,
        lift: recommendation.lift ?? null,
        similarity: recommendation.similarity ?? null,
        popularity: recommendation.popularity ?? null,
        attachRate: recommendation.attachRate ?? null,
      },
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    lookbackDays: baskets.lookbackDays,
    poweredBy: model.poweredBy,
    model: {
      method: model.method ?? null,
      modelReady: Boolean(model.modelReady),
      minimumRequired: model.minimumRequired ?? null,
      stats: model.stats,
    },
    recommendations,
  };
}

function nameProductIds(productIds, catalogByProductId) {
  return (productIds ?? [])
    .map((productId) => catalogByProductId.get(String(productId)))
    .filter(Boolean)
    .map((entry) => ({ productId: entry.productId, productName: entry.productName }));
}

/**
 * Staff view of the same model: what it learned, not what to upsell right now.
 * Called with an EMPTY cart so the rules and attach rates describe the shop as
 * a whole rather than one shopper's basket.
 */
const getRecommendationInsights = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const [baskets, catalog] = await Promise.all([
      getOrderBaskets(shopId, branchId),
      getOrderableCatalog(shopId, branchId),
    ]);

    const catalogByProductId = new Map(catalog.map((entry) => [entry.productId, entry]));

    const model = await computeRecommendationsViaMl({
      transactions: baskets.transactions,
      cartItemIds: [],
      candidates: catalog.map(toCandidate),
      favouriteIds: [],
      limit: DEFAULT_LIMIT,
      // Python returns its rules already ranked by lift; cap there so Node never
      // has to decide which rules are the "top" ones.
      maxRules: INSIGHTS_RULE_LIMIT,
    });

    const rules = [];
    for (const rule of model.rules ?? []) {
      const antecedent = nameProductIds(rule.antecedent, catalogByProductId);
      const consequent = catalogByProductId.get(String(rule.consequent));
      // A rule about a product that is no longer on the menu cannot be acted on.
      if (!consequent || antecedent.length !== (rule.antecedent ?? []).length) continue;

      rules.push({
        antecedent,
        consequent: { productId: consequent.productId, productName: consequent.productName },
        sentence: `Customers who order ${antecedent
          .map((item) => item.productName)
          .join(' + ')} usually add ${consequent.productName}`,
        support: rule.support,
        confidence: rule.confidence,
        lift: rule.lift,
        count: rule.count,
      });
    }

    const categoryAttach = (model.categoryAttach ?? []).map((entry) => ({
      categoryId: entry.categoryId ?? null,
      categoryName: entry.categoryName,
      attachRate: entry.attachRate,
      sentence: `${entry.categoryName} appears in ${Math.round(entry.attachRate * 100)}% of orders`,
      topProducts: nameProductIds(entry.topProductIds, catalogByProductId),
    }));

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: {
        generatedAt: new Date().toISOString(),
        lookbackDays: baskets.lookbackDays,
        poweredBy: model.poweredBy,
        model: {
          method: model.method ?? null,
          modelReady: Boolean(model.modelReady),
          minimumRequired: model.minimumRequired ?? null,
          stats: model.stats,
        },
        rules,
        categoryAttach,
      },
      message: model.modelReady
        ? 'Recommendation insights generated'
        : `Not enough completed orders yet — ${model.minimumRequired} are needed.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  buildCustomerRecommendations,
  getRecommendationInsights,
  MIN_LIMIT,
  MAX_LIMIT,
  DEFAULT_LIMIT,
};
