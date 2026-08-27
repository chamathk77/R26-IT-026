const History = require('../../models/history');
const Product = require('../../models/product');
const BranchStock = require('../../models/branchStock');

/**
 * Deliberately a full year, unlike the 90-day window the forecasting novelties
 * use. Forecasting wants recency; market-basket mining wants VOLUME — a pair
 * only clears the support threshold once it has been ordered together enough
 * times, so the whole point here is to learn from the shop's entire sales
 * history rather than from the latest trend.
 */
const DEFAULT_LOOKBACK_DAYS = 365;
const DEFAULT_FAVOURITE_LIMIT = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One completed order = one transaction (an ITEMSET). Quantities and repeated
 * lines are dropped because Apriori counts "did this basket contain X", never
 * "how many X" — so the productIds are deduplicated inside each basket and
 * empty baskets are discarded before they can skew the support denominator.
 */
async function getOrderBaskets(shopId, branchId, options = {}) {
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const now = options.now ?? new Date();
  const rangeStart = new Date(now.getTime() - lookbackDays * ONE_DAY_MS);

  const rows = await History.aggregate([
    {
      $match: {
        shopId,
        branchId,
        status: 'submited',
        checkOutTime: { $gte: rangeStart },
      },
    },
    {
      $project: {
        _id: 0,
        // $setUnion dedupes in the database, so no $unwind/$group round trip.
        productIds: {
          $setUnion: [{ $map: { input: '$items', as: 'item', in: '$$item.productId' } }, []],
        },
      },
    },
  ]);

  const transactions = [];
  for (const row of rows) {
    const basket = (row.productIds ?? [])
      .filter(Boolean)
      .map((productId) => String(productId));
    if (basket.length) {
      transactions.push(basket);
    }
  }

  return { transactions, transactionCount: transactions.length, lookbackDays };
}

/**
 * Everything a customer could actually add to the cart at this branch, with
 * branch stock applied — the recommender must never pitch a product that is
 * off the menu or sold out.
 */
async function getOrderableCatalog(shopId, branchId) {
  const products = await Product.find({
    shopId,
    type: 'product',
    amount: { $ne: null, $gt: 0 },
  })
    .select('productName categoryId categoryName amount image isInventoryAvailable')
    .lean();

  const trackedIds = products.filter((product) => product.isInventoryAvailable).map((p) => p._id);
  const stocks = trackedIds.length
    ? await BranchStock.find({ shopId, branchId, productId: { $in: trackedIds } })
        .select('productId qty')
        .lean()
    : [];

  const qtyByProductId = new Map(
    stocks.map((stock) => [String(stock.productId), Number(stock.qty) || 0]),
  );

  return products.map((product) => {
    const tracked = Boolean(product.isInventoryAvailable);
    const qty = tracked ? qtyByProductId.get(String(product._id)) ?? 0 : null;

    return {
      productId: String(product._id),
      productName: product.productName,
      categoryId: product.categoryId ? String(product.categoryId) : null,
      categoryName: product.categoryName ?? '',
      amount: Number(product.amount) || 0,
      image: product.image ?? '',
      isInventoryAvailable: tracked,
      qty,
      available: tracked ? qty > 0 : true,
    };
  });
}

/**
 * The products this mobile number has bought most often at this branch — the
 * only personalisation signal a QR customer gives us, since there is no login.
 */
async function getCustomerFavouriteProductIds(shopId, branchId, phone, limit = DEFAULT_FAVOURITE_LIMIT) {
  const customerMobile = String(phone ?? '').trim();
  if (!customerMobile) return [];

  const rows = await History.aggregate([
    {
      $match: {
        shopId,
        branchId,
        status: 'submited',
        customerMobile,
      },
    },
    { $unwind: '$items' },
    { $group: { _id: '$items.productId', orderCount: { $sum: 1 } } },
    { $sort: { orderCount: -1, _id: 1 } },
    { $limit: Math.max(1, Number(limit) || DEFAULT_FAVOURITE_LIMIT) },
  ]);

  return rows.filter((row) => row._id).map((row) => String(row._id));
}

module.exports = {
  getOrderBaskets,
  getOrderableCatalog,
  getCustomerFavouriteProductIds,
  DEFAULT_LOOKBACK_DAYS,
};
