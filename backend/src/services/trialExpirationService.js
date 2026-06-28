const ShopsData = require('../models/shopsData');
const User = require('../models/user');
const TrialCronReport = require('../models/trialCronReport');
const { sendSms } = require('./smsService');
const { TRIAL_DURATION_DAYS } = require('../utils/trialHelper');

function normalizeShopId(shopId) {
  return String(shopId).trim().toUpperCase();
}

function getShopOwnerMobile(shop) {
  return shop.ownerMobileNumber?.trim() || shop.shopMobileNumber?.trim() || '';
}

function isTrialEndDatePassed(shop, now = new Date()) {
  if (!shop?.trailEndDate) {
    return false;
  }
  return new Date(shop.trailEndDate).getTime() <= now.getTime();
}

function buildTrialExpiredSmsMessage(shop) {
  const endLabel = shop.trailEndDate
    ? new Date(shop.trailEndDate).toLocaleString('en-LK', {
        timeZone: 'Asia/Colombo',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'today';

  return `Smart Cost: Your ${TRIAL_DURATION_DAYS}-day trial ended on ${endLabel}. Please pay your due payments and submit your receipts in the app to continue.`;
}

async function sendTrialExpiredSms(shop) {
  const mobile = getShopOwnerMobile(shop);
  if (!mobile) {
    return { sent: false, reason: 'Owner mobile number is not set' };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildTrialExpiredSmsMessage(shop),
    });
    return { sent: true };
  } catch (error) {
    console.log('error in sendTrialExpiredSms', shop.shopId, error.message);
    return { sent: false, reason: error.message || 'SMS send failed' };
  }
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
  if (!shopDoc || shopDoc.status !== 'trial') {
    return null;
  }

  if (!isTrialEndDatePassed(shopDoc)) {
    return null;
  }

  const shopId = shopDoc.shopId;

  shopDoc.isTrailCompleted = true;
  shopDoc.status = 'trialExpired';
  await shopDoc.save();

  const smsResult = await sendTrialExpiredSms(shopDoc);
  const usersLoggedOut = await clearShopUserTokens(shopId);

  return {
    shopId,
    shopName: shopDoc.shopName,
    trailEndDate: shopDoc.trailEndDate,
    previousStatus: 'trial',
    newStatus: 'trialExpired',
    usersLoggedOut,
    smsSent: Boolean(smsResult.sent),
    smsReason: smsResult.sent ? null : smsResult.reason || 'SMS send failed',
  };
}

function normalizeExpiredEntry(entry) {
  const smsSent = entry.smsSent ?? entry.sms?.sent ?? false;
  const smsReason =
    entry.smsReason ?? (smsSent ? null : entry.sms?.reason || 'SMS send failed');

  return {
    shopId: entry.shopId,
    shopName: entry.shopName ?? null,
    trailEndDate: entry.trailEndDate ?? null,
    previousStatus: entry.previousStatus ?? 'trial',
    newStatus: entry.newStatus ?? 'trialExpired',
    usersLoggedOut: entry.usersLoggedOut ?? 0,
    smsSent,
    smsReason,
  };
}

function getReportDateKey(date = new Date(), timezone = 'Asia/Colombo') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function resolveRunStatus({ fatalError, errorsCount, expiredCount }) {
  if (fatalError) {
    return 'failed';
  }
  if (errorsCount > 0) {
    return expiredCount > 0 ? 'partial' : 'failed';
  }
  return 'success';
}

async function saveTrialCronReport(report, meta = {}) {
  const checkedAt = new Date(report.checkedAt || Date.now());
  const timezone = meta.timezone || 'Asia/Colombo';
  const expired = (report.expired || []).map(normalizeExpiredEntry);
  const skipped = report.skipped || [];
  const errors = report.errors || [];
  const smsSentCount = expired.filter((entry) => entry.smsSent).length;

  const payload = {
    reportDate: getReportDateKey(checkedAt, timezone),
    checkedAt,
    schedule: meta.schedule ?? null,
    timezone,
    candidatesFound: report.candidatesFound ?? 0,
    expiredCount: expired.length,
    skippedCount: skipped.length,
    errorsCount: errors.length,
    smsSentCount,
    smsFailedCount: expired.length - smsSentCount,
    fatalError: report.fatalError ?? null,
    reportData: {
      expired,
      skipped,
      errors,
    },
  };

  payload.runStatus = resolveRunStatus(payload);

  return TrialCronReport.findOneAndUpdate(
    { reportDate: payload.reportDate },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

/**
 * Scans trial shops past trailEndDate, marks them trialExpired,
 * notifies the owner, and clears mobile session tokens.
 */
async function runDailyTrialExpirationCheck(meta = {}) {
  const now = new Date();

  const report = {
    checkedAt: now.toISOString(),
    candidatesFound: 0,
    expired: [],
    skipped: [],
    errors: [],
  };

  try {
    const candidateShops = await ShopsData.find({
      status: 'trial',
      isTrailStared: true,
      trailEndDate: { $ne: null, $lte: now },
    }).sort({ trailEndDate: 1 });

    report.candidatesFound = candidateShops.length;

    for (const shop of candidateShops) {
      try {
        if (shop.status !== 'trial') {
          report.skipped.push({
            shopId: shop.shopId,
            reason: 'Shop is no longer on trial',
          });
          continue;
        }

        if (!isTrialEndDatePassed(shop, now)) {
          report.skipped.push({
            shopId: shop.shopId,
            reason: 'Trial end date has not passed',
          });
          continue;
        }

        const entry = await expireTrialShop(shop);
        if (!entry) {
          report.skipped.push({
            shopId: shop.shopId,
            reason: 'Could not expire trial shop',
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

    const savedReport = await saveTrialCronReport(report, meta);
    report.reportId = savedReport._id;

    return report;
  } catch (error) {
    report.fatalError = error.message;
    report.errors.push({
      shopId: null,
      message: error.message,
    });

    try {
      const savedReport = await saveTrialCronReport(report, meta);
      report.reportId = savedReport._id;
    } catch (saveError) {
      console.error('[trial-cron] Failed to save trial cron report:', saveError.message);
    }

    throw error;
  }
}

module.exports = {
  runDailyTrialExpirationCheck,
  expireTrialShop,
  clearShopUserTokens,
  sendTrialExpiredSms,
  saveTrialCronReport,
};
