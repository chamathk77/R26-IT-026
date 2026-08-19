const History = require('../../models/history');
const Customer = require('../../models/customer');
const Product = require('../../models/product');
const { getMonthlySeries } = require('../novelty01Forecasting/forecastDataService');

const DEFAULT_LOOKBACK_DAYS = 180;
const DEFAULT_TREND_LOOKBACK_MONTHS = 12;

function buildRangeStart(days, now) {
  const start = new Date(now ?? Date.now());
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Submitted orders for the branch within the lookback window, projected down
 * to the fields the behavior engine actually needs (hour/day patterns,
 * product line items, customer linkage).
 */
async function getRecentOrders(shopId, branchId, options = {}) {
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const rangeStart = buildRangeStart(lookbackDays, options.now);

  const orders = await History.find({
    shopId,
    branchId,
    status: 'submited',
    checkOutTime: { $gte: rangeStart },
  })
    .select('checkOutTime totalAmount items customerMobile')
    .sort({ checkOutTime: 1 })
    .lean();

  return { orders, rangeStart, lookbackDays };
}

/**
 * Customers are shop-wide (no branchId on the Customer schema), unlike
 * History which is branch-scoped — segmentation below is intentionally
 * shop-wide rather than per-branch.
 */
async function getShopCustomers(shopId) {
  return Customer.find({ shopId })
    .select('mobileNumber name totalSales totalOrders lastUpdate points')
    .lean();
}

/** Shop-wide catalog, used to price line items and to spot products with zero sales in the window. */
async function getShopProducts(shopId) {
  return Product.find({ shopId, type: 'product' })
    .select('productName amount cost')
    .lean();
}

/** Reuses novelty01's monthly sales aggregation so trend detection doesn't duplicate that query. */
async function getSalesTrendSeries(shopId, branchId, options = {}) {
  const lookbackMonths = options.lookbackMonths ?? DEFAULT_TREND_LOOKBACK_MONTHS;
  const series = await getMonthlySeries(shopId, branchId, { lookbackMonths, now: options.now });
  return series.months.filter((row) => !row.partial);
}

module.exports = {
  getRecentOrders,
  getShopCustomers,
  getShopProducts,
  getSalesTrendSeries,
  DEFAULT_LOOKBACK_DAYS,
  DEFAULT_TREND_LOOKBACK_MONTHS,
};
