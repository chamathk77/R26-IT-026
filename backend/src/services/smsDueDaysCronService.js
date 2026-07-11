const ShopsData = require('../models/shopsData');
const SmsDueDaysCronReport = require('../models/smsDueDaysCronReport');

const SMS_DUE_STATUS = 'due';
const SMS_PENDING_STATUS = 'pending';
const OVERDUE_DAYS_THRESHOLD = 14;
const COUNTABLE_SMS_STATUSES = [SMS_DUE_STATUS, SMS_PENDING_STATUS];

function processShopSmsDueDays(shop) {
  const smsFeature = shop.smsfeature ?? {};
  const currentStatus = smsFeature.smsFeatureStatus ?? null;

  if (!COUNTABLE_SMS_STATUSES.includes(currentStatus)) {
    return {
      updates: null,
      result: {
        shopId: shop.shopId,
        action: 'skipped',
        reason: 'sms_status_not_due_or_pending',
        smsFeatureStatus: currentStatus,
      },
    };
  }

  const previousDueDays = Number(smsFeature.smsDueDays ?? 0);
  const newDueDays = previousDueDays + 1;

  // Escalate to pending once due days pass 14, but only while status is still `due`.
  // Shops already in pending keep incrementing without changing status.
  const statusChanged = currentStatus === SMS_DUE_STATUS && newDueDays > OVERDUE_DAYS_THRESHOLD;
  const newStatus = statusChanged ? SMS_PENDING_STATUS : currentStatus;

  const updates = {
    'smsfeature.smsDueDays': newDueDays,
  };

  if (statusChanged) {
    updates['smsfeature.smsFeatureStatus'] = SMS_PENDING_STATUS;
    updates['smsfeature.isSmsFeatureActive'] = false;
  }

  return {
    updates,
    result: {
      shopId: shop.shopId,
      action: statusChanged ? 'escalated' : 'incremented',
      previousDueDays,
      newDueDays,
      statusChanged,
      previousStatus: currentStatus,
      newStatus,
      isSmsFeatureActive: statusChanged ? false : smsFeature.isSmsFeatureActive ?? null,
    },
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

function resolveRunStatus({ fatalError, errorsCount, processedCount }) {
  if (fatalError) {
    return 'failed';
  }
  if (errorsCount > 0) {
    return processedCount > 0 ? 'partial' : 'failed';
  }
  return 'success';
}

async function saveSmsDueDaysCronReport(report, meta = {}) {
  const checkedAt = new Date(report.checkedAt || Date.now());
  const timezone = meta.timezone || 'Asia/Colombo';
  const processed = report.processed || [];
  const escalated = report.escalated || [];
  const skipped = report.skipped || [];
  const errors = report.errors || [];

  const payload = {
    reportDate: getReportDateKey(checkedAt, timezone),
    checkedAt,
    schedule: meta.schedule ?? null,
    timezone,
    totalShopsChecked: report.totalShopsChecked ?? 0,
    processedCount: processed.length,
    escalatedCount: escalated.length,
    skippedCount: skipped.length,
    errorsCount: errors.length,
    fatalError: report.fatalError ?? null,
    reportData: {
      processed,
      escalated,
      skipped,
      errors,
    },
  };

  payload.runStatus = resolveRunStatus({
    fatalError: payload.fatalError,
    errorsCount: payload.errorsCount,
    processedCount: payload.processedCount,
  });

  return SmsDueDaysCronReport.findOneAndUpdate(
    { reportDate: payload.reportDate },
    { $set: payload },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
}

/**
 * Daily SMS due-days job:
 * - For smsFeatureStatus pending or due → smsDueDays + 1
 * - If status is due and smsDueDays becomes larger than 14 → set status to pending
 *   and set isSmsFeatureActive to false
 */
async function runDailySmsDueDaysCheck(meta = {}) {
  const report = {
    checkedAt: new Date().toISOString(),
    totalShopsChecked: 0,
    processed: [],
    escalated: [],
    skipped: [],
    errors: [],
  };

  try {
    const shops = await ShopsData.find({
      'smsfeature.smsFeatureStatus': { $in: COUNTABLE_SMS_STATUSES },
    })
      .select('shopId smsfeature')
      .lean();

    report.totalShopsChecked = shops.length;

    for (const shop of shops) {
      try {
        const { updates, result } = processShopSmsDueDays(shop);

        if (!updates) {
          report.skipped.push(result);
          continue;
        }

        await ShopsData.updateOne({ _id: shop._id }, { $set: updates });

        report.processed.push(result);
        if (result.statusChanged) {
          report.escalated.push(result);
        }
      } catch (error) {
        report.errors.push({
          shopId: shop.shopId,
          reason: error.message,
        });
      }
    }

    console.log('[sms-due-days-cron] Daily SMS due days check');
    console.log(
      `[sms-due-days-cron] Summary: checked=${report.totalShopsChecked}, ` +
        `processed=${report.processed.length}, ` +
        `escalated=${report.escalated.length}, ` +
        `skipped=${report.skipped.length}, ` +
        `errors=${report.errors.length}`,
    );

    if (report.escalated.length > 0) {
      console.log('[sms-due-days-cron] Escalated to pending:', report.escalated);
    }

    if (report.errors.length > 0) {
      console.log('[sms-due-days-cron] Errors:', report.errors);
    }

    const savedReport = await saveSmsDueDaysCronReport(report, meta);
    report.reportId = savedReport._id;

    return report;
  } catch (error) {
    report.fatalError = error.message;
    report.errors.push({
      shopId: null,
      reason: error.message,
    });

    try {
      const savedReport = await saveSmsDueDaysCronReport(report, meta);
      report.reportId = savedReport._id;
    } catch (saveError) {
      console.error(
        '[sms-due-days-cron] Failed to save SMS due days cron report:',
        saveError.message,
      );
    }

    throw error;
  }
}

module.exports = {
  runDailySmsDueDaysCheck,
  processShopSmsDueDays,
  saveSmsDueDaysCronReport,
  OVERDUE_DAYS_THRESHOLD,
  COUNTABLE_SMS_STATUSES,
};
