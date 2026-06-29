const ShopsData = require('../models/shopsData');
const DueDaysCronReport = require('../models/dueDaysCronReport');

const SUBSCRIPTION_DUE_STATUS = 'due';
const SMS_DUE_STATUS = 'due';
const SUBSCRIPTION_OVERDUE_STATUS = 'paymentPending';
const SMS_OVERDUE_STATUS = 'inactive';
const OVERDUE_DAYS_THRESHOLD = 14;

function processShopDueDays(shop) {
  const updates = {};
  const result = {
    shopId: shop.shopId,
    subscription: null,
    sms: null,
  };

  if (shop.status === SUBSCRIPTION_DUE_STATUS) {
    const previousDueDays = Number(shop.subscriptionDueDays ?? 0);
    const statusChanged = previousDueDays > OVERDUE_DAYS_THRESHOLD;

    if (statusChanged) {
      updates.status = SUBSCRIPTION_OVERDUE_STATUS;
    }

    updates.subscriptionDueDays = previousDueDays + 1;

    result.subscription = {
      previousDueDays,
      newDueDays: previousDueDays + 1,
      statusChanged,
      newStatus: statusChanged ? SUBSCRIPTION_OVERDUE_STATUS : SUBSCRIPTION_DUE_STATUS,
    };
  }

  if (shop.smsStatus === SMS_DUE_STATUS) {
    const previousDueDays = Number(shop.smsDueDays ?? 0);
    const statusChanged = previousDueDays > OVERDUE_DAYS_THRESHOLD;

    if (statusChanged) {
      updates.smsStatus = SMS_OVERDUE_STATUS;
      updates.sendReceiptSms = false;
    }

    updates.smsDueDays = previousDueDays + 1;

    result.sms = {
      previousDueDays,
      newDueDays: previousDueDays + 1,
      statusChanged,
      newSmsStatus: statusChanged ? SMS_OVERDUE_STATUS : SMS_DUE_STATUS,
      sendReceiptSmsDisabled: statusChanged,
    };
  }

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
  const sms = report.sms || [];
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
    smsProcessedCount: sms.length,
    smsStatusChangedCount: sms.filter((entry) => entry.statusChanged).length,
    skippedCount: skipped.length,
    errorsCount: errors.length,
    fatalError: report.fatalError ?? null,
    reportData: {
      subscription,
      sms,
      skipped,
      errors,
    },
  };

  payload.runStatus = resolveRunStatus({
    fatalError: payload.fatalError,
    errorsCount: payload.errorsCount,
    processedCount: payload.subscriptionProcessedCount + payload.smsProcessedCount,
  });

  return DueDaysCronReport.findOneAndUpdate(
    { reportDate: payload.reportDate },
    { $set: payload },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
}

/**
 * Daily due-days job: increment subscriptionDueDays / smsDueDays for shops with open bills.
 * When due days exceed 14 before increment, move subscription to paymentPending or disable SMS.
 */
async function runDailyDueDaysCheck(meta = {}) {
  const report = {
    checkedAt: new Date().toISOString(),
    totalShopsChecked: 0,
    subscription: [],
    sms: [],
    skipped: [],
    errors: [],
  };

  try {
    const shops = await ShopsData.find({
      $or: [{ status: SUBSCRIPTION_DUE_STATUS }, { smsStatus: SMS_DUE_STATUS }],
    })
      .select('shopId status subscriptionDueDays smsStatus smsDueDays sendReceiptSms')
      .lean();

    report.totalShopsChecked = shops.length;

    for (const shop of shops) {
      try {
        const { updates, result } = processShopDueDays(shop);

        if (Object.keys(updates).length === 0) {
          report.skipped.push({
            shopId: shop.shopId,
            reason: 'no_due_subscription_or_sms_status',
          });
          continue;
        }

        await ShopsData.updateOne({ shopId: shop.shopId }, { $set: updates });

        if (result.subscription) {
          report.subscription.push(result);
        }
        if (result.sms) {
          report.sms.push(result);
        }
      } catch (error) {
        report.errors.push({
          shopId: shop.shopId,
          reason: error.message,
        });
      }
    }

    console.log('[due-days-cron] Daily due days check');
    console.log(
      `[due-days-cron] Summary: checked=${report.totalShopsChecked}, ` +
        `subscription=${report.subscription.length}, ` +
        `sms=${report.sms.length}, ` +
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
};
