const Cart = require('../models/cart');
const History = require('../models/history');

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function normalizeBranchId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

/**
 * Next free cart number for a branch. Cart numbers are unique per branch within a
 * shop and are shared between open carts and checked-out history records.
 */
async function getNextCartNumber(shopId, branchId) {
  const normalizedShopId = normalizeShopId(shopId);
  const normalizedBranchId = normalizeBranchId(branchId);
  if (!normalizedShopId) {
    throw new Error('Shop id is required');
  }
  if (!normalizedBranchId) {
    throw new Error('Branch id is required');
  }

  const scopeFilter = { shopId: normalizedShopId, branchId: normalizedBranchId };

  const [latestCart, latestHistory] = await Promise.all([
    Cart.findOne(scopeFilter).sort({ cartNumber: -1 }).select('cartNumber').lean(),
    History.findOne(scopeFilter).sort({ cartNumber: -1 }).select('cartNumber').lean(),
  ]);

  let candidate =
    Math.max(latestCart?.cartNumber ?? 0, latestHistory?.cartNumber ?? 0) + 1;

  // Cart numbers are unique per branch within a shop.
  while (
    (await Cart.exists({ ...scopeFilter, cartNumber: candidate })) ||
    (await History.exists({ ...scopeFilter, cartNumber: candidate }))
  ) {
    candidate += 1;
  }

  return candidate;
}

module.exports = {
  getNextCartNumber,
};
