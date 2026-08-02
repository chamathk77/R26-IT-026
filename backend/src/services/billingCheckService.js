const Payments = require('../models/payments');
const ShopsData = require('../models/shopsData');
const BillingCronReport = require('../models/billingCronReport');
const { addDays } = require('../utils/trialHelper');
const { sendSms } = require('./smsService');
const { clearShopUserTokens } = require('./trialExpirationService');
const {
  generatePlanSubscriptionReceiptNumber,
  generateSubscriptionReceiptNumber,
  getPaymentMonthFromDate,
  UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
} = require('../utils/paymentReceiptHelper');

const ONE_MONTH_SUBSCRIPTION = '1month';
const MULTI_MONTH_SUBSCRIPTION_TYPES = ['3months', '6months', '1year'];
const BILLABLE_SHOP_STATUSES = ['active'];

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isNextPaymentDatePassed(nextPaymentDate, today) {
  return startOfDay(nextPaymentDate).getTime() <= startOfDay(today).getTime();
}

function isMultiMonthSubscriptionType(subscriptionType) {
  return MULTI_MONTH_SUBSCRIPTION_TYPES.includes(subscriptionType);
}

function buildAdditionalPayments(shop) {
  if (!shop.isAdditionalUsersAdded) {
    return [];
  }

  const count = Number.parseInt(String(shop.numAdditionalUsers ?? ''), 10);
  if (!Number.isFinite(count) || count <= 0) {
    return [];
  }

  const billingMonths = ShopsData.getSubscriptionBillingMonths(shop.subscriptionType);
  if (!billingMonths) {
    return [];
  }

  const unitFee = ShopsData.ADDITIONAL_USER_FEE_LKR;
  const amount = billingMonths * count * unitFee;
  const monthLabel = billingMonths === 1 ? 'month' : 'months';

  return [
    {
      name: `Additional users (${count} × Rs. ${unitFee.toLocaleString('en-LK')} × ${billingMonths} ${monthLabel})`,
      amount,
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

const CHANGE_SUBSCRIPTION_PLAN_LABELS = {
  '3months': '3-month',
  '6months': '6-month',
  '1year': '1-year',
};

function buildChangeSubscriptionPaymentDescription(subscriptionType) {
  const planLabel = CHANGE_SUBSCRIPTION_PLAN_LABELS[subscriptionType] ?? subscriptionType;
  return `Subscription plan change payment for ${planLabel} plan. Pay this invoice to complete your plan change.`;
}

function buildChangeSubscriptionInvoiceSmsMessage({ receiptNumber, paymentAmount }) {
  const amountLabel = Number(paymentAmount).toLocaleString('en-LK');
  return (
    `Smart Cost: Your subscription plan change invoice (Receipt: ${receiptNumber}, Rs. ${amountLabel}) ` +
    'has been sent. Please complete payment within 14 days in the Payments section.'
  );
}

async function sendChangeSubscriptionInvoiceSms(shop, { receiptNumber, paymentAmount }) {
  const mobile = shop.ownerMobileNumber?.trim();
  if (!mobile) {
    return { sent: false, reason: 'Owner mobile number is not set' };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildChangeSubscriptionInvoiceSmsMessage({ receiptNumber, paymentAmount }),
    });
    return { sent: true };
  } catch (error) {
    console.log(
      '[change-subscription] SMS failed for shop',
      shop.shopId,
      error.message,
    );
    return { sent: false, reason: error.message || 'SMS send failed' };
  }
}

/**
 * Create a multi-month subscription invoice when the shop selects a new plan
 * during the changeSubscription flow.
 */
async function createChangeSubscriptionMultiMonthInvoice(shop, subscriptionType) {
  if (!isMultiMonthSubscriptionType(subscriptionType)) {
    return { error: 'invalid_subscription_type', validTypes: MULTI_MONTH_SUBSCRIPTION_TYPES };
  }

  const baseFee = ShopsData.getSubscriptionFee(subscriptionType);
  if (baseFee == null || baseFee <= 0) {
    return { error: 'subscription_fee_not_configured', subscriptionType };
  }

  const existingOpenInvoice = await Payments.findOne({
    shopId: shop.shopId,
    paymentType: 'subscription',
    status: { $in: ['notPaid', 'pending'] },
  }).lean();

  if (existingOpenInvoice) {
    return {
      error: 'open_invoice_exists',
      paymentId: String(existingOpenInvoice._id),
      paymentStatus: existingOpenInvoice.status,
    };
  }

  const billingDay = startOfDay();
  const additionalPayments = buildAdditionalPayments({
    isAdditionalUsersAdded: shop.isAdditionalUsersAdded,
    numAdditionalUsers: shop.numAdditionalUsers,
    subscriptionType,
  });
  const paymentAmount = calculatePaymentAmount(baseFee, additionalPayments);
  const receiptNumber = await generatePlanSubscriptionReceiptNumber(billingDay);

  const payment = await Payments.create({
    shopId: shop.shopId,
    receiptNumber,
    receiptImagePath: UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
    paymentAmount,
    additionalPayments,
    paymentType: 'subscription',
    IsOnboaringPayment: false,
    subscriptionType,
    exactPaymentDay: billingDay,
    expiryDate: null,
    status: 'notPaid',
    description: buildChangeSubscriptionPaymentDescription(subscriptionType),
  });

  const updated = await ShopsData.findOneAndUpdate(
    { shopId: shop.shopId },
    {
      $set: {
        subscriptionType,
        status: 'due',
        currentPaymentDoneDate: null,
        nextPaymentDate: billingDay,
        subscriptionReceiptNo: String(payment._id),
        subscriptionDueDays: 1,
      },
    },
    { returnDocument: 'after', runValidators: true },
  )
    .select(
      'shopId subscriptionType status nextPaymentDate subscriptionReceiptNo subscriptionDueDays currentPaymentDoneDate',
    )
    .lean();

  const sms = await sendChangeSubscriptionInvoiceSms(shop, {
    receiptNumber,
    paymentAmount,
  });

  return { shop: updated, payment, smsSent: sms.sent, smsReason: sms.sent ? null : sms.reason };
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

/**
 * Multi-month renewal with a queued plan change: skip old-plan invoice,
 * move shop to changeSubscription, clear pending flag, and log out all users.
 */
async function applyMultiMonthPendingChangeAtRenewal(shop) {
  await ShopsData.updateOne(
    { shopId: shop.shopId },
    {
      $set: {
        status: 'changeSubscription',
        isSubscriptionChangePending: false,
      },
    },
  );

  const usersLoggedOut = await clearShopUserTokens(shop.shopId);

  return {
    action: 'subscription_change_applied',
    shopId: shop.shopId,
    subscriptionType: shop.subscriptionType,
    nextPaymentDate: shop.nextPaymentDate,
    usersLoggedOut,
    reason: 'multi_month_pending_change_at_renewal',
  };
}

async function processShopForBilling(shop, today) {
  const shopId = shop.shopId;
/** Subscription payment */
  if (!shop.nextPaymentDate) {
    return { action: 'skipped', reason: 'no_next_payment_date' };
  }

  /** Subscription payment */
  if (!isNextPaymentDatePassed(shop.nextPaymentDate, today)) {
    return { action: 'skipped', reason: 'next_payment_date_not_due' };
  }

  /** Subscription payment */
  if (!BILLABLE_SHOP_STATUSES.includes(shop.status)) {
    return { action: 'skipped', reason: 'shop_not_active', status: shop.status };
  }
  /** Subscription payment */
  const subscriptionType = shop.subscriptionType;
  if (!subscriptionType || !ShopsData.SUBSCRIPTION_TYPES.includes(subscriptionType)) {
    return { action: 'skipped', reason: 'invalid_subscription_type' };
  }

  if (
    shop.isSubscriptionChangePending === true &&
    isMultiMonthSubscriptionType(subscriptionType)
  ) {
    return applyMultiMonthPendingChangeAtRenewal(shop);
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

  /** Subscription payment */
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
 * Multi-month shops with isSubscriptionChangePending skip invoicing and move to changeSubscription.
 */
async function runDailyBillingCheck(meta = {}) {
  const today = startOfDay();

  const report = {
    checkedAt: new Date().toISOString(),
    today: today.toISOString(),
    totalShopsChecked: 0,
    invoiced: [],
    subscriptionChanges: [],
    skipped: [],
    errors: [],
  };

  try {
    const shops = await ShopsData.find({
      nextPaymentDate: { $ne: null },
      subscriptionType: { $ne: null },
    })
      .select(
        'shopId shopName status nextPaymentDate subscriptionType isSubscriptionChangePending isAdditionalUsersAdded numAdditionalUsers subscriptionReceiptNo ownerMobileNumber',
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

        if (result.action === 'subscription_change_applied') {
          report.subscriptionChanges.push(result);
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
        `subscriptionChanges=${report.subscriptionChanges.length}, ` +
        `skipped=${report.skipped.length}, ` +
        `errors=${report.errors.length}`,
    );

    if (report.invoiced.length > 0) {
      console.log('[billing-cron] Invoices created:', report.invoiced);
    }

    if (report.subscriptionChanges.length > 0) {
      console.log('[billing-cron] Multi-month plan changes applied:', report.subscriptionChanges);
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
  applyMultiMonthPendingChangeAtRenewal,
  createChangeSubscriptionMultiMonthInvoice,
  buildAdditionalPayments,
  calculatePaymentAmount,
  isNextPaymentDatePassed,
  isMultiMonthSubscriptionType,
  saveBillingCronReport,
};
