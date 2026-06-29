const Payments = require('../models/payments');
const ShopsData = require('../models/shopsData');
const History = require('../models/history');
const SmsBillingCronReport = require('../models/smsBillingCronReport');
const { sendSms } = require('./smsService');
const {
  generateSmsReceiptNumber,
  UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
} = require('../utils/paymentReceiptHelper');

const SMS_BILLABLE_STATUS = 'active';
const SMS_PAYMENT_GRACE_DAYS = 14;

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isSmsNextPaymentDatePassed(smsNextPaymentDate, today) {
  return startOfDay(smsNextPaymentDate).getTime() <= startOfDay(today).getTime();
}

function formatDateLabel(date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function buildSmsBillDescription(periodStart, periodEnd, smsCount) {
  const periodLabel = `${formatDateLabel(periodStart)} to ${formatDateLabel(periodEnd)}`;
  return `SMS usage bill for period ${periodLabel} (${smsCount} message${smsCount === 1 ? '' : 's'} sent)`;
}

function calculateSmsPaymentAmount(smsCount) {
  const unitFee = ShopsData.PER_SMS_FEE_LKR;
  return Math.round(smsCount * unitFee * 100) / 100;
}

async function countBillableSmsInPeriod(shopId, periodStart, periodEnd) {
  return History.countDocuments({
    shopId,
    isSmsSent: true,
    checkOutTime: {
      $gte: startOfDay(periodStart),
      $lte: endOfDay(periodEnd),
    },
  });
}

async function findExistingSmsBillingInvoice(shopId, exactPaymentDay) {
  return Payments.findOne({
    shopId,
    paymentType: 'sms',
    exactPaymentDay: startOfDay(exactPaymentDay),
  }).lean();
}

function buildSmsBillingInvoiceSmsMessage({ receiptNumber, paymentAmount }) {
  const amountLabel = Number(paymentAmount).toLocaleString('en-LK');
  return (
    `Smart Cost: Your SMS service invoice (Receipt: ${receiptNumber}, Rs. ${amountLabel}) ` +
    `has been uploaded in Payments. To continue receipt SMS service, please settle this bill within ${SMS_PAYMENT_GRACE_DAYS} days.`
  );
}

async function sendSmsBillingInvoiceSms(shop, { receiptNumber, paymentAmount }) {
  const mobile = shop.ownerMobileNumber?.trim();
  if (!mobile) {
    return { sent: false, reason: 'Owner mobile number is not set' };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildSmsBillingInvoiceSmsMessage({ receiptNumber, paymentAmount }),
    });
    return { sent: true };
  } catch (error) {
    console.log('[sms-billing-cron] SMS failed for shop', shop.shopId, error.message);
    return { sent: false, reason: error.message || 'SMS send failed' };
  }
}

async function processShopForSmsBilling(shop, today) {
  const shopId = shop.shopId;

  if (!shop.smsNextPaymentDate) {
    return { action: 'skipped', reason: 'no_sms_next_payment_date' };
  }

  if (!shop.smsCalculationStartDate) {
    return { action: 'skipped', reason: 'no_sms_calculation_start_date' };
  }

  if (!isSmsNextPaymentDatePassed(shop.smsNextPaymentDate, today)) {
    return { action: 'skipped', reason: 'sms_next_payment_date_not_due' };
  }

  if (shop.smsStatus !== SMS_BILLABLE_STATUS) {
    return {
      action: 'skipped',
      reason: 'sms_status_not_active',
      smsStatus: shop.smsStatus ?? null,
    };
  }

  const billingDay = startOfDay(shop.smsNextPaymentDate);
  const periodStart = startOfDay(shop.smsCalculationStartDate);
  const periodEnd = billingDay;

  const existingInvoice = await findExistingSmsBillingInvoice(shopId, billingDay);
  if (existingInvoice) {
    return {
      action: 'skipped',
      reason: 'invoice_already_exists',
      receiptNumber: existingInvoice.receiptNumber,
    };
  }

  const smsCount = await countBillableSmsInPeriod(shopId, periodStart, periodEnd);
  const paymentAmount = calculateSmsPaymentAmount(smsCount);
  const receiptNumber = await generateSmsReceiptNumber(billingDay);
  const description = buildSmsBillDescription(periodStart, periodEnd, smsCount);

  const payment = await Payments.create({
    shopId,
    receiptNumber,
    receiptImagePath: UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
    paymentAmount,
    paymentType: 'sms',
    subscriptionType: null,
    exactPaymentDay: billingDay,
    status: 'notPaid',
    description,
  });

  await ShopsData.updateOne(
    { _id: shop._id },
    {
      $set: {
        smsReceiptNo: String(payment._id),
        smsStatus: 'due',
      },
    },
  );

  const ownerSms = await sendSmsBillingInvoiceSms(shop, { receiptNumber, paymentAmount });

  return {
    action: 'invoiced',
    shopId,
    receiptNumber,
    paymentId: String(payment._id),
    paymentAmount,
    smsCount,
    exactPaymentDay: billingDay,
    periodStart,
    periodEnd,
    description,
    smsSent: ownerSms.sent,
    smsReason: ownerSms.sent ? null : ownerSms.reason,
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

function normalizeSmsInvoicedEntry(entry) {
  const ownerSmsSent = entry.smsSent ?? false;
  return {
    shopId: entry.shopId,
    receiptNumber: entry.receiptNumber ?? null,
    paymentId: entry.paymentId ?? null,
    paymentAmount: entry.paymentAmount ?? null,
    smsCount: entry.smsCount ?? 0,
    exactPaymentDay: entry.exactPaymentDay ?? null,
    periodStart: entry.periodStart ?? null,
    periodEnd: entry.periodEnd ?? null,
    description: entry.description ?? null,
    ownerSmsSent,
    ownerSmsReason: entry.smsReason ?? (ownerSmsSent ? null : 'Owner SMS send failed'),
  };
}

function resolveRunStatus({ fatalError, errorsCount, invoicedCount }) {
  if (fatalError) {
    return 'failed';
  }
  if (errorsCount > 0) {
    return invoicedCount > 0 ? 'partial' : 'failed';
  }
  return 'success';
}

async function saveSmsBillingCronReport(report, meta = {}) {
  const checkedAt = new Date(report.checkedAt || Date.now());
  const timezone = meta.timezone || 'Asia/Colombo';
  const invoiced = (report.invoiced || []).map(normalizeSmsInvoicedEntry);
  const skipped = report.skipped || [];
  const errors = report.errors || [];
  const ownerSmsSentCount = invoiced.filter((entry) => entry.ownerSmsSent).length;

  const payload = {
    reportDate: getReportDateKey(checkedAt, timezone),
    checkedAt,
    schedule: meta.schedule ?? null,
    timezone,
    totalShopsChecked: report.totalShopsChecked ?? 0,
    invoicedCount: invoiced.length,
    skippedCount: skipped.length,
    errorsCount: errors.length,
    ownerSmsSentCount,
    ownerSmsFailedCount: invoiced.length - ownerSmsSentCount,
    fatalError: report.fatalError ?? null,
    reportData: {
      invoiced,
      skipped,
      errors,
    },
  };

  payload.runStatus = resolveRunStatus(payload);

  return SmsBillingCronReport.findOneAndUpdate(
    { reportDate: payload.reportDate },
    { $set: payload },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
}

/**
 * Daily SMS billing job: for each shop with smsStatus active whose smsNextPaymentDate
 * has passed, count receipt SMS sent in the billing period and create a notPaid invoice.
 */
async function runDailySmsBillingCheck(meta = {}) {
  const today = startOfDay();

  const report = {
    checkedAt: new Date().toISOString(),
    today: today.toISOString(),
    totalShopsChecked: 0,
    invoiced: [],
    skipped: [],
    errors: [],
  };

  try {
    const shops = await ShopsData.find({
      smsNextPaymentDate: { $ne: null },
      smsCalculationStartDate: { $ne: null },
    })
      .select(
        'shopId shopName sendReceiptSms smsStatus smsNextPaymentDate smsCalculationStartDate smsReceiptNo ownerMobileNumber',
      )
      .sort({ smsNextPaymentDate: 1 })
      .lean();

    report.totalShopsChecked = shops.length;

    for (const shop of shops) {
      try {
        const result = await processShopForSmsBilling(shop, today);

        if (result.action === 'invoiced') {
          report.invoiced.push(result);
          continue;
        }

        if (result.action === 'error') {
          report.errors.push({ shopId: shop.shopId, ...result });
          continue;
        }

        report.skipped.push({ shopId: shop.shopId, ...result });
      } catch (error) {
        report.errors.push({
          shopId: shop.shopId,
          action: 'error',
          reason: error.message,
        });
      }
    }

    console.log('[sms-billing-cron] Daily SMS invoice generation');
    const smsSentCount = report.invoiced.filter((entry) => entry.smsSent).length;
    console.log(
      `[sms-billing-cron] Summary: checked=${report.totalShopsChecked}, ` +
        `invoiced=${report.invoiced.length}, ` +
        `skipped=${report.skipped.length}, ` +
        `errors=${report.errors.length}, ` +
        `ownerSmsSent=${smsSentCount}`,
    );

    if (report.invoiced.length > 0) {
      console.log('[sms-billing-cron] Invoices created:', report.invoiced);
    }

    if (report.errors.length > 0) {
      console.log('[sms-billing-cron] Errors:', report.errors);
    }

    const savedReport = await saveSmsBillingCronReport(report, meta);
    report.reportId = savedReport._id;

    return report;
  } catch (error) {
    report.fatalError = error.message;
    report.errors.push({
      shopId: null,
      reason: error.message,
    });

    try {
      const savedReport = await saveSmsBillingCronReport(report, meta);
      report.reportId = savedReport._id;
    } catch (saveError) {
      console.error('[sms-billing-cron] Failed to save SMS billing cron report:', saveError.message);
    }

    throw error;
  }
}

module.exports = {
  runDailySmsBillingCheck,
  processShopForSmsBilling,
  countBillableSmsInPeriod,
  isSmsNextPaymentDatePassed,
  saveSmsBillingCronReport,
};
