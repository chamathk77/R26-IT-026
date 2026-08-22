const { getDailyProductDemand } = require('./productDemandDataService');
const { computeProductDemandViaMl } = require('./productDemandClientViaMl');

const MAX_HORIZON_DAYS = 30;
const HORIZONS = [
  { key: 'next7Days', label: 'Next 7 days', days: 7 },
  { key: 'next14Days', label: 'Next 14 days', days: 14 },
  { key: 'next30Days', label: 'Next 30 days', days: 30 },
];

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

/**
 * Sums the daily points into the 7/14/30-day windows the UI shows, the same
 * way novelty01 buckets its monthly points into horizon summaries — Python
 * stays a generic per-day forecaster, Node owns the business-facing shaping.
 */
function bucketHorizons(dailyPoints) {
  const horizons = {};
  for (const horizon of HORIZONS) {
    const slice = dailyPoints.slice(0, horizon.days);
    horizons[horizon.key] = {
      label: horizon.label,
      days: horizon.days,
      totalPredictedUnits: Math.round(slice.reduce((sum, point) => sum + point.predicted, 0)),
      lowerUnits: Math.round(slice.reduce((sum, point) => sum + point.lower, 0)),
      upperUnits: Math.round(slice.reduce((sum, point) => sum + point.upper, 0)),
    };
  }
  return horizons;
}

const getProductDemandForecast = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { products, lookbackDays, daysOfHistory } = await getDailyProductDemand(shopId, branchId);

    if (!products.length) {
      return res.status(200).json({
        success: true,
        shopId,
        branchId,
        data: {
          generatedAt: new Date().toISOString(),
          lookbackDays,
          daysOfHistory,
          dataQuality: {
            level: 'insufficient',
            message: 'No products found in your catalog yet.',
          },
          results: [],
        },
        message: 'No products to forecast',
      });
    }

    const mlResult = await computeProductDemandViaMl(products, MAX_HORIZON_DAYS);

    const results = mlResult.results.map((result) => ({
      productId: result.productId,
      productName: result.productName,
      method: result.method,
      daysOfHistory: result.daysOfHistory,
      dailyPoints: result.dailyPoints,
      horizons: bucketHorizons(result.dailyPoints),
    }));

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: {
        generatedAt: new Date().toISOString(),
        lookbackDays,
        daysOfHistory,
        dataQuality: {
          level: 'good',
          message: `Based on up to ${daysOfHistory} days of sales history across ${products.length} product(s) in your catalog.`,
        },
        poweredBy: mlResult.poweredBy,
        results,
      },
      message: 'Product demand forecast generated',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getProductDemandForecast };
