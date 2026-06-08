const ShopsData = require('../models/shopsData');
const User = require('../models/user');
const {
  isTrialPastEndDate,
  markTrialAsExpired,
} = require('../utils/trialHelper');

function normalizeShopId(shopId) {
  return String(shopId).trim().toUpperCase();
}

async function clearShopUserTokens(shopId) {
  const normalizedShopId = normalizeShopId(shopId);

  const result = await User.updateMany(
    {
      shopId: normalizedShopId,
      isInternalUser: { $ne: true },
      token: { $ne: null },
    },
    { $set: { token: null } },
  );

  return result.modifiedCount;
}

async function expireTrialShop(shopDoc) {
  if (shopDoc.isTrailCompleted) {
    return null;
  }

  const shopId = shopDoc.shopId;

  await markTrialAsExpired(shopDoc);
  const usersLoggedOut = await clearShopUserTokens(shopId);

  return {
    shopId,
    shopName: shopDoc.shopName,
    trailEndDate: shopDoc.trailEndDate,
    usersLoggedOut,
  };
}

/**
 * Finds active trials past trailEndDate, marks them trialExpired,
 * and clears mobile session tokens for all shop users.
 */
async function runDailyTrialExpirationCheck() {
  const now = new Date();

  const candidateShops = await ShopsData.find({
    isTrailStared: true,
    isTrailCompleted: false,
    status: 'trial',
    trailEndDate: { $ne: null, $lte: now },
  }).sort({ trailEndDate: 1 });

  const report = {
    checkedAt: now.toISOString(),
    candidatesFound: candidateShops.length,
    expired: [],
    skipped: [],
    errors: [],
  };

  for (const shop of candidateShops) {
    try {
      if (shop.isTrailCompleted) {
        report.skipped.push({
          shopId: shop.shopId,
          reason: 'Trial already completed',
        });
        continue;
      }

      if (!isTrialPastEndDate(shop)) {
        report.skipped.push({
          shopId: shop.shopId,
          reason: 'End date not passed',
        });
        continue;
      }

      const entry = await expireTrialShop(shop);
      if (!entry) {
        report.skipped.push({
          shopId: shop.shopId,
          reason: 'Trial already completed',
        });
        continue;
      }

      report.expired.push(entry);
    } catch (error) {
      report.errors.push({
        shopId: shop.shopId,
        message: error.message,
      });
    }
  }

  console.log('[trial-cron] Daily trial expiration check');
  console.log(
    `[trial-cron] Summary: candidates=${report.candidatesFound}, ` +
      `expired=${report.expired.length}, ` +
      `skipped=${report.skipped.length}, ` +
      `errors=${report.errors.length}`,
  );

  if (report.expired.length > 0) {
    console.log('[trial-cron] Expired trials:', report.expired);
  }

  if (report.errors.length > 0) {
    console.error('[trial-cron] Errors:', report.errors);
  }

  return report;
}

module.exports = {
  runDailyTrialExpirationCheck,
  expireTrialShop,
  clearShopUserTokens,
};
