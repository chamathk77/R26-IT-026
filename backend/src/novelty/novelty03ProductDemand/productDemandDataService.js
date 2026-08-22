const History = require('../../models/history');
const Product = require('../../models/product');

const REPORTING_TIMEZONE = process.env.FORECAST_TIMEZONE || 'Asia/Colombo';
const DEFAULT_LOOKBACK_DAYS = 90;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function dayKeyInTimezone(date, timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Daily quantity series for EVERY catalog product (shop-wide, matching
 * Product's own scoping), not just top sellers — a product with no sales in
 * the window still gets an all-zero series, which the forecast engine
 * handles gracefully (predicts near-zero demand, which is itself a useful
 * signal). Evenly spaced with zero-filled gaps (required for Holt-Winters);
 * "today" is excluded as still partial, same as the other novelties.
 */
async function getDailyProductDemand(shopId, branchId, options = {}) {
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const now = options.now ?? new Date();

  const todayKey = dayKeyInTimezone(now, REPORTING_TIMEZONE);
  const rangeStart = new Date(now.getTime() - lookbackDays * ONE_DAY_MS);

  const [catalogProducts, rows] = await Promise.all([
    Product.find({ shopId, type: 'product' }).select('productName').lean(),
    History.aggregate([
      {
        $match: {
          shopId,
          branchId,
          status: 'submited',
          checkOutTime: { $gte: rangeStart },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            productId: '$items.productId',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$checkOutTime', timezone: REPORTING_TIMEZONE } },
          },
          qty: { $sum: '$items.qty' },
        },
      },
    ]),
  ]);

  const salesByProductId = new Map();
  for (const row of rows) {
    if (row._id.day === todayKey || !row._id.productId) continue;

    const key = String(row._id.productId);
    if (!salesByProductId.has(key)) {
      salesByProductId.set(key, new Map());
    }
    const dayMap = salesByProductId.get(key);
    dayMap.set(row._id.day, (dayMap.get(row._id.day) ?? 0) + row.qty);
  }

  const dayKeys = [];
  for (let offset = lookbackDays; offset >= 1; offset -= 1) {
    dayKeys.push(dayKeyInTimezone(new Date(now.getTime() - offset * ONE_DAY_MS), REPORTING_TIMEZONE));
  }

  const products = catalogProducts.map((product) => {
    const dayMap = salesByProductId.get(String(product._id)) ?? new Map();
    return {
      productId: String(product._id),
      productName: product.productName,
      dailyQuantities: dayKeys.map((day) => dayMap.get(day) ?? 0),
    };
  });

  return { products, lookbackDays, daysOfHistory: dayKeys.length };
}

module.exports = {
  getDailyProductDemand,
  DEFAULT_LOOKBACK_DAYS,
};
