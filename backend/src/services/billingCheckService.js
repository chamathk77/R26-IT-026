const Payments = require('../models/payments');
const ShopsData = require('../models/shopsData');
const BillingCronReport = require('../models/billingCronReport');
const { addDays } = require('../utils/trialHelper');
const { sendSms } = require('./smsService');
const {
  generatePlanSubscriptionReceiptNumber,
  generateSubscriptionReceiptNumber,
  getPaymentMonthFromDate,
  UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
} = require('../utils/paymentReceiptHelper');

const ONE_MONTH_SUBSCRIPTION = '1month';
const BILLABLE_SHOP_STATUSES = ['active'];

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isNextPaymentDatePassed(nextPaymentDate, today) {
  return startOfDay(nextPaymentDate).getTime() <= startOfDay(today).getTime();
}

function buildAdditionalPayments(shop) {
  if (!shop.isAdditionalUsersAdded) {
    return [];
  }

  const count = Number.parseInt(String(shop.numAdditionalUsers ?? ''), 10);
  if (!Number.isFinite(count) || count <= 0) {
    return [];
  }

  const unitFee = ShopsData.ADDITIONAL_USER_FEE_LKR;
  return [
    {
      name: `Additional users (${count} × Rs. ${unitFee.toLocaleString('en-LK')})`,
      amount: count * unitFee,
    },
  ];
}

function calculatePaymentAmount(baseAmount, additionalPayments) {
  const additionalTotal = additionalPayments.reduce((sum, item) => sum + item.amount, 0);
  return baseAmount + additionalTotal;
}

function getSubscriptionExpiryDate(subscriptionType, nextPaymentDate) {
  const durationDays = ShopsData.SUBSCRIPTION_DURATION_DAYS[subscriptionType];
  if (!durationDays) {
    return null;
  }
  return startOfDay(addDays(startOfDay(nextPaymentDate), durationDays));
}

async function generateBillingReceiptNumber(subscriptionType, nextPaymentDate) {
  if (subscriptionType === ONE_MONTH_SUBSCRIPTION) {
    const paymentMonth = getPaymentMonthFromDate(nextPaymentDate);
    return generateSubscriptionReceiptNumber(paymentMonth, nextPaymentDate);
  }

  return generatePlanSubscriptionReceiptNumber(nextPaymentDate);
}

async function findExistingBillingInvoice(shopId, exactPaymentDay) {
  return Payments.findOne({
    shopId,
    paymentType: 'subscription',
    exactPaymentDay: startOfDay(exactPaymentDay),
  }).lean();
}

function buildSubscriptionInvoiceSmsMessage({ receiptNumber, paymentAmount }) {
  const amountLabel = Number(paymentAmount).toLocaleString('en-LK');
  return (
    `Smart Cost: Your subscription invoice (Receipt: ${receiptNumber}, Rs. ${amountLabel}) ` +
    'has been uploaded in Payments. Please check it and pay to continue your subscription.'
  );
}

async function sendSubscriptionInvoiceSms(shop, { receiptNumber, paymentAmount }) {
  const mobile = shop.ownerMobileNumber?.trim();
  if (!mobile) {
    return { sent: false, reason: 'Owner mobile number is not set' };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildSubscriptionInvoiceSmsMessage({ receiptNumber, paymentAmount }),
    });
    return { sent: true };
  } catch (error) {
    console.log('[billing-cron] SMS failed for shop', shop.shopId, error.message);
    return { sent: false, reason: error.message || 'SMS send failed' };
  }
}

async function processShopForBilling(shop, today) {
  const shopId = shop.shopId;

  if (!shop.nextPaymentDate) {
    return { action: 'skipped', reason: 'no_next_payment_date' };
  }

  if (!isNextPaymentDatePassed(shop.nextPaymentDate, today)) {
    return { action: 'skipped', reason: 'next_payment_date_not_due' };
  }

  if (!BILLABLE_SHOP_STATUSES.includes(shop.status)) {
    return { action: 'skipped', reason: 'shop_not_active', status: shop.status };
  }

  const subscriptionType = shop.subscriptionType;
  if (!subscriptionType || !ShopsData.SUBSCRIPTION_TYPES.includes(subscriptionType)) {
    return { action: 'skipped', reason: 'invalid_subscription_type' };
  }

  const billingDay = startOfDay(shop.nextPaymentDate);
  const existingInvoice = await findExistingBillingInvoice(shopId, billingDay);
  if (existingInvoice) {
    return {
      action: 'skipped',
      reason: 'invoice_already_exists',
      receiptNumber: existingInvoice.receiptNumber,
    };
  }

  const baseFee = ShopsData.getSubscriptionFee(subscriptionType);
  if (baseFee == null || baseFee <= 0) {
    return { action: 'error', reason: 'subscription_fee_not_configured', subscriptionType };
  }

  const additionalPayments = buildAdditionalPayments(shop);
  const paymentAmount = calculatePaymentAmount(baseFee, additionalPayments);
  const paymentMonth =
    subscriptionType === ONE_MONTH_SUBSCRIPTION ? getPaymentMonthFromDate(billingDay) : null;
  const receiptNumber = await generateBillingReceiptNumber(subscriptionType, billingDay);
  const expiryDate = getSubscriptionExpiryDate(subscriptionType, billingDay);

  const payment = await Payments.create({
    shopId,
    receiptNumber,
    receiptImagePath: UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
    paymentMonth,
    paymentAmount,
    additionalPayments,
    paymentType: 'subscription',
    subscriptionType,
    exactPaymentDay: billingDay,
    expiryDate,
    status: 'notPaid',
  });

  await ShopsData.updateOne(
    { _id: shop._id },
    {
      $set: {
        subscriptionReceiptNo: String(payment._id),
        status: 'due',
      },
    },
  );

  const sms = await sendSubscriptionInvoiceSms(shop, { receiptNumber, paymentAmount });

  return {
    action: 'invoiced',
    shopId,
    receiptNumber,
    paymentId: String(payment._id),
    paymentAmount,
    subscriptionType,
    exactPaymentDay: billingDay,
    smsSent: sms.sent,
    smsReason: sms.sent ? null : sms.reason,
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

function normalizeInvoicedEntry(entry) {
  const smsSent = entry.smsSent ?? false;
  return {
    shopId: entry.shopId,
    receiptNumber: entry.receiptNumber ?? null,
    paymentId: entry.paymentId ?? null,
    paymentAmount: entry.paymentAmount ?? null,
    subscriptionType: entry.subscriptionType ?? null,
    exactPaymentDay: entry.exactPaymentDay ?? null,
    smsSent,
    smsReason: entry.smsReason ?? (smsSent ? null : 'SMS send failed'),
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

async function saveBillingCronReport(report, meta = {}) {
  const checkedAt = new Date(report.checkedAt || Date.now());
  const timezone = meta.timezone || 'Asia/Colombo';
  const invoiced = (report.invoiced || []).map(normalizeInvoicedEntry);
  const skipped = report.skipped || [];
  const errors = report.errors || [];
  const smsSentCount = invoiced.filter((entry) => entry.smsSent).length;

  const payload = {
    reportDate: getReportDateKey(checkedAt, timezone),
    checkedAt,
    schedule: meta.schedule ?? null,
    timezone,
    totalShopsChecked: report.totalShopsChecked ?? 0,
    invoicedCount: invoiced.length,
    skippedCount: skipped.length,
    errorsCount: errors.length,
    smsSentCount,
    smsFailedCount: invoiced.length - smsSentCount,
    fatalError: report.fatalError ?? null,
    reportData: {
      invoiced,
      skipped,
      errors,
    },
  };

  payload.runStatus = resolveRunStatus(payload);

  return BillingCronReport.findOneAndUpdate(
    { reportDate: payload.reportDate },
    { $set: payload },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
}

/**
 * Daily billing job: for each active shop whose nextPaymentDate has passed,
 * create a notPaid subscription invoice and mark the shop as due.
 */
async function runDailyBillingCheck(meta = {}) {
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
      nextPaymentDate: { $ne: null },
      subscriptionType: { $ne: null },
    })
      .select(
        'shopId shopName status nextPaymentDate subscriptionType isAdditionalUsersAdded numAdditionalUsers subscriptionReceiptNo ownerMobileNumber',
      )
      .sort({ nextPaymentDate: 1 })
      .lean();

    report.totalShopsChecked = shops.length;

    for (const shop of shops) {
      try {
        const result = await processShopForBilling(shop, today);

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

    console.log('[billing-cron] Daily subscription invoice generation');
    console.log(
      `[billing-cron] Summary: checked=${report.totalShopsChecked}, ` +
        `invoiced=${report.invoiced.length}, ` +
        `skipped=${report.skipped.length}, ` +
        `errors=${report.errors.length}`,
    );

    if (report.invoiced.length > 0) {
      console.log('[billing-cron] Invoices created:', report.invoiced);
    }

    if (report.errors.length > 0) {
      console.log('[billing-cron] Errors:', report.errors);
    }

    const savedReport = await saveBillingCronReport(report, meta);
    report.reportId = savedReport._id;

    return report;
  } catch (error) {
    report.fatalError = error.message;
    report.errors.push({
      shopId: null,
      reason: error.message,
    });

    try {
      const savedReport = await saveBillingCronReport(report, meta);
      report.reportId = savedReport._id;
    } catch (saveError) {
      console.error('[billing-cron] Failed to save billing cron report:', saveError.message);
    }

    throw error;
  }
}

module.exports = {
  runDailyBillingCheck,
  processShopForBilling,
  buildAdditionalPayments,
  isNextPaymentDatePassed,
  saveBillingCronReport,
};
