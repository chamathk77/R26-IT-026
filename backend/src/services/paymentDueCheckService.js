const ShopsData = require('../models/shopsData');
const DueDaysCronReport = require('../models/dueDaysCronReport');
const { clearShopUserTokens } = require('./trialExpirationService');
const { sendSms } = require('./smsService');

const SUBSCRIPTION_DUE_STATUS = 'due';
const SUBSCRIPTION_OVERDUE_STATUS = 'paymentPending';
const OVERDUE_DAYS_THRESHOLD = 14;
const COUNTABLE_DUE_STATUSES = [SUBSCRIPTION_DUE_STATUS, SUBSCRIPTION_OVERDUE_STATUS];

function getShopOwnerMobile(shop) {
  return shop.ownerMobileNumber?.trim() || shop.shopMobileNumber?.trim() || '';
}

function buildPaymentPendingDeactivationSms() {
  return (
    'Smart Cost: Your account has been temporarily deactivated because your subscription payment is overdue. ' +
    'Please pay the outstanding amount and submit your receipt in the app to reactivate your account.'
  );
}

async function sendPaymentPendingDeactivationSms(shop) {
  const mobile = getShopOwnerMobile(shop);
  if (!mobile) {
    return { sent: false, reason: 'Owner mobile number is not set' };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildPaymentPendingDeactivationSms(),
    });
    return { sent: true };
  } catch (error) {
    console.log(
      '[due-days-cron] paymentPending SMS not sent',
      shop.shopId,
      error.message,
    );
    return { sent: false, reason: error.message || 'SMS send failed' };
  }
}

function processShopDueDays(shop) {
  const updates = {};
  const result = {
    shopId: shop.shopId,
    subscription: null,
  };

  if (!COUNTABLE_DUE_STATUSES.includes(shop.status)) {
    return { updates, result };
  }

  const previousDueDays = Number(shop.subscriptionDueDays ?? 0);
  const newDueDays = previousDueDays + 1;

  // Escalate to paymentPending after 14 due days have passed, but only while
  // the shop is still in the `due` state. Shops already in paymentPending keep
  // incrementing without changing status.
  const statusChanged =
    shop.status === SUBSCRIPTION_DUE_STATUS &&
    previousDueDays >= OVERDUE_DAYS_THRESHOLD;

  if (statusChanged) {
    updates.status = SUBSCRIPTION_OVERDUE_STATUS;
  }

  updates.subscriptionDueDays = newDueDays;

  const newStatus = statusChanged ? SUBSCRIPTION_OVERDUE_STATUS : shop.status;

  result.subscription = {
    previousDueDays,
    newDueDays,
    statusChanged,
    previousStatus: shop.status,
    newStatus,
  };

  return { updates, result };
}

function getReportDateKey(date = new Date(), timezone = 'Asia/Colombo') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function resolveRunStatus({ fatalError, errorsCount, processedCount }) {
  if (fatalError) {
    return 'failed';
  }
  if (errorsCount > 0) {
    return processedCount > 0 ? 'partial' : 'failed';
  }
  return 'success';
}

async function saveDueDaysCronReport(report, meta = {}) {
  const checkedAt = new Date(report.checkedAt || Date.now());
  const timezone = meta.timezone || 'Asia/Colombo';
  const subscription = report.subscription || [];
  const skipped = report.skipped || [];
  const errors = report.errors || [];

  const payload = {
    reportDate: getReportDateKey(checkedAt, timezone),
    checkedAt,
    schedule: meta.schedule ?? null,
    timezone,
    totalShopsChecked: report.totalShopsChecked ?? 0,
    subscriptionProcessedCount: subscription.length,
    subscriptionStatusChangedCount: subscription.filter((entry) => entry.statusChanged).length,
    smsProcessedCount: 0,
    smsStatusChangedCount: 0,
    skippedCount: skipped.length,
    errorsCount: errors.length,
    fatalError: report.fatalError ?? null,
    reportData: {
      subscription,
      sms: [],
      skipped,
      errors,
    },
  };

  payload.runStatus = resolveRunStatus({
    fatalError: payload.fatalError,
    errorsCount: payload.errorsCount,
    processedCount: payload.subscriptionProcessedCount,
  });

  return DueDaysCronReport.findOneAndUpdate(
    { reportDate: payload.reportDate },
    { $set: payload },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
}

/**
 * Daily due-days job: increment subscriptionDueDays for shops with status due
 * or paymentPending. After 14 due days while still `due`, move status to
 * paymentPending, log out all users for that shop, and notify the owner by SMS.
 */
async function runDailyDueDaysCheck(meta = {}) {
  const report = {
    checkedAt: new Date().toISOString(),
    totalShopsChecked: 0,
    subscription: [],
    skipped: [],
    errors: [],
  };

  try {
    const shops = await ShopsData.find({ status: { $in: COUNTABLE_DUE_STATUSES } })
      .select(
        'shopId status subscriptionDueDays ownerMobileNumber shopMobileNumber',
      )
      .lean();

    report.totalShopsChecked = shops.length;

    for (const shop of shops) {
      try {
        const { updates, result } = processShopDueDays(shop);

        if (Object.keys(updates).length === 0) {
          report.skipped.push({
            shopId: shop.shopId,
            reason: 'subscription_not_due',
          });
          continue;
        }

        await ShopsData.updateOne({ shopId: shop.shopId }, { $set: updates });

        if (result.subscription?.statusChanged) {
          const usersLoggedOut = await clearShopUserTokens(shop.shopId);
          const customerSms = await sendPaymentPendingDeactivationSms(shop);
          result.subscription.usersLoggedOut = usersLoggedOut;
          result.subscription.customerSms = customerSms;
        }

        report.subscription.push(result);
      } catch (error) {
        report.errors.push({
          shopId: shop.shopId,
          reason: error.message,
        });
      }
    }

    console.log('[due-days-cron] Daily subscription due days check');
    console.log(
      `[due-days-cron] Summary: checked=${report.totalShopsChecked}, ` +
        `subscription=${report.subscription.length}, ` +
        `skipped=${report.skipped.length}, ` +
        `errors=${report.errors.length}`,
    );

    const savedReport = await saveDueDaysCronReport(report, meta);
    report.reportId = savedReport._id;

    return report;
  } catch (error) {
    report.fatalError = error.message;
    report.errors.push({
      shopId: null,
      reason: error.message,
    });

    try {
      const savedReport = await saveDueDaysCronReport(report, meta);
      report.reportId = savedReport._id;
    } catch (saveError) {
      console.error('[due-days-cron] Failed to save due days cron report:', saveError.message);
    }

    throw error;
  }
}

module.exports = {
  runDailyDueDaysCheck,
  processShopDueDays,
  saveDueDaysCronReport,
  OVERDUE_DAYS_THRESHOLD,
  buildPaymentPendingDeactivationSms,
};
