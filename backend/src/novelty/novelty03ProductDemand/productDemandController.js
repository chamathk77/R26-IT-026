const { getDailyProductDemand } = require('./productDemandDataService');
const { computeProductDemandViaMl } = require('./productDemandClientViaMl');

const MAX_HORIZON_DAYS = 30;
const HORIZONS = [
  { key: 'next7Days', label: 'Next 7 days', days: 7 },
  { key: 'next14Days', label: 'Next 14 days', days: 14 },
  { key: 'next30Days', label: 'Next 30 days', days: 30 },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

/**
 * Feature 1: Stockout Risk Warning & Suggested Reorder Quantity
 * Compare currentStock with forecasted demand at 7-day and 30-day windows.
 */
function computeStockStatus(currentStock, horizons) {
  const predicted7 = horizons.next7Days?.totalPredictedUnits ?? 0;
  const predicted30 = horizons.next30Days?.totalPredictedUnits ?? 0;

  let status, label;
  if (currentStock < predicted7) {
    // Will run out within 7 days
    const daysUntilStockout = predicted7 > 0
      ? Math.max(1, Math.round((currentStock / predicted7) * 7))
      : 0;
    status = 'stockout_risk';
    label = `Runs out in ~${daysUntilStockout} day${daysUntilStockout === 1 ? '' : 's'}!`;
  } else if (currentStock > predicted30 * 2) {
    status = 'overstock';
    label = 'Overstock — consider reducing orders';
  } else {
    status = 'sufficient';
    label = 'Stock is sufficient for the coming week';
  }

  const suggestedReorder = Math.max(0, predicted7 - currentStock);

  return {
    currentStock,
    status,         // 'stockout_risk' | 'sufficient' | 'overstock'
    label,
    suggestedReorder,
    daysOfStockLeft: predicted7 > 0
      ? Math.round((currentStock / (predicted7 / 7)))
      : currentStock > 0 ? 999 : 0,
  };
}

/**
 * Feature 2: Demand Trend & Growth Indicator
 * Compare last 7 days of actual sales vs next 7 days of predicted demand.
 */
function computeDemandTrend(dailyQuantities, horizons) {
  // Sum the last 7 days of historical sales
  const last7 = dailyQuantities.slice(-7);
  const historicalSum = last7.reduce((sum, qty) => sum + qty, 0);
  const forecastSum = horizons.next7Days?.totalPredictedUnits ?? 0;

  let trend, percentChange;
  if (historicalSum === 0 && forecastSum === 0) {
    trend = 'steady';
    percentChange = 0;
  } else if (historicalSum === 0) {
    trend = 'surging';
    percentChange = 100;
  } else {
    percentChange = Math.round(((forecastSum - historicalSum) / historicalSum) * 100);
    if (percentChange >= 35) {
      trend = 'surging';
    } else if (percentChange <= -20) {
      trend = 'declining';
    } else {
      trend = 'steady';
    }
  }

  return {
    trend,          // 'surging' | 'steady' | 'declining'
    percentChange,  // e.g. +35, -20, +2
    last7DaySales: historicalSum,
    next7DayForecast: forecastSum,
  };
}

/**
 * Feature 3: Projected Revenue & Profit Potential
 * Multiply forecasted units by selling price and margin.
 */
function computeRevenueProjection(horizons, sellingPrice, unitCost) {
  const projection = {};
  for (const horizon of HORIZONS) {
    const units = horizons[horizon.key]?.totalPredictedUnits ?? 0;
    const revenue = Math.round(units * sellingPrice);
    const cost = Math.round(units * unitCost);
    const profit = revenue - cost;
    projection[horizon.key] = {
      expectedRevenue: revenue,
      expectedCost: cost,
      grossProfit: profit,
      marginPercent: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
    };
  }
  return projection;
}

/**
 * Feature 4: Peak Demand Day of the Week
 * Find the day with the highest predicted quantity in the 7-day forecast
 * and map it to actual day names.
 */
function computePeakDay(dailyPoints) {
  const first7 = dailyPoints.slice(0, 7);
  if (!first7.length) return null;

  let maxIdx = 0;
  let maxVal = first7[0].predicted;
  for (let i = 1; i < first7.length; i++) {
    if (first7[i].predicted > maxVal) {
      maxVal = first7[i].predicted;
      maxIdx = i;
    }
  }

  // Map day offset to actual day name.
  // dailyPoints[0] is "tomorrow", dailyPoints[1] is day-after-tomorrow, etc.
  const today = new Date();
  const peakDate = new Date(today.getTime() + (maxIdx + 1) * 24 * 60 * 60 * 1000);
  const dayName = DAY_NAMES[peakDate.getDay()];

  return {
    dayName,
    dayIndex: maxIdx + 1,  // 1-based offset from today
    predictedUnits: Math.round(maxVal),
  };
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
          summary: null,
        },
        message: 'No products to forecast',
      });
    }

    const mlResult = await computeProductDemandViaMl(products, MAX_HORIZON_DAYS);

    // Build a lookup from productId to the original product data (stock, price, cost, daily history)
    const productLookup = new Map();
    for (const p of products) {
      productLookup.set(p.productId, p);
    }

    // Aggregate summary values
    let totalRevenue7 = 0, totalProfit7 = 0;
    let totalRevenue14 = 0, totalProfit14 = 0;
    let totalRevenue30 = 0, totalProfit30 = 0;
    let restockCount = 0;

    const results = mlResult.results.map((result) => {
      const horizons = bucketHorizons(result.dailyPoints);
      const original = productLookup.get(result.productId) || {};
      const currentStock = original.currentStock ?? 0;
      const sellingPrice = original.sellingPrice ?? 0;
      const unitCost = original.unitCost ?? 0;

      // Feature 1: Stockout risk
      const stockStatus = computeStockStatus(currentStock, horizons);

      // Feature 2: Demand trend
      const demandTrend = computeDemandTrend(
        original.dailyQuantities ?? [],
        horizons,
      );

      // Feature 3: Revenue projection
      const revenueProjection = computeRevenueProjection(horizons, sellingPrice, unitCost);

      // Feature 4: Peak day
      const peakDay = computePeakDay(result.dailyPoints);

      // Accumulate summary totals
      totalRevenue7 += revenueProjection.next7Days?.expectedRevenue ?? 0;
      totalProfit7 += revenueProjection.next7Days?.grossProfit ?? 0;
      totalRevenue14 += revenueProjection.next14Days?.expectedRevenue ?? 0;
      totalProfit14 += revenueProjection.next14Days?.grossProfit ?? 0;
      totalRevenue30 += revenueProjection.next30Days?.expectedRevenue ?? 0;
      totalProfit30 += revenueProjection.next30Days?.grossProfit ?? 0;
      if (stockStatus.status === 'stockout_risk') restockCount++;

      return {
        productId: result.productId,
        productName: result.productName,
        method: result.method,
        daysOfHistory: result.daysOfHistory,
        dailyPoints: result.dailyPoints,
        horizons,
        // New enriched fields
        stockStatus,
        demandTrend,
        revenueProjection,
        peakDay,
        sellingPrice,
        unitCost,
      };
    });

    // Feature 5 support: summary for the "Restock Checklist" filter
    const summary = {
      totalProducts: results.length,
      restockNeededCount: restockCount,
      revenue: {
        next7Days: { expectedRevenue: totalRevenue7, grossProfit: totalProfit7 },
        next14Days: { expectedRevenue: totalRevenue14, grossProfit: totalProfit14 },
        next30Days: { expectedRevenue: totalRevenue30, grossProfit: totalProfit30 },
      },
    };

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
        summary,
      },
      message: 'Product demand forecast generated',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getProductDemandForecast };
