const Payments = require('../models/payments');
const ShopsData = require('../models/shopsData');
const { sendSms } = require('./smsService');
const {
  generateSmsReceiptNumber,
  getPaymentMonthFromDate,
  UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
} = require('../utils/paymentReceiptHelper');

const SMS_RENEWAL_PERIOD_DAYS = 30;
const SMS_PAYMENT_DUE_DAYS = 14;

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isRenewalDatePassed(renewalDate, today) {
  return startOfDay(renewalDate).getTime() <= startOfDay(today).getTime();
}

function findSmsPackageFee(packageType) {
  const normalized = String(packageType ?? '').trim();
  const matched = ShopsData.SMS_PACKAGES.find((pkg) => pkg.type === normalized);
  return matched?.fee ?? null;
}

function formatSmsBillingDescription(renewalDate) {
  const formatted = startOfDay(renewalDate).toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `SMS package billing for ${SMS_RENEWAL_PERIOD_DAYS} days up to ${formatted}`;
}

async function findExistingSmsInvoice(shopId, exactPaymentDay) {
  return Payments.findOne({
    shopId,
    paymentType: 'sms',
    exactPaymentDay: startOfDay(exactPaymentDay),
  }).lean();
}

async function markSmsFeatureDue(shopIdOrObjectId) {
  return ShopsData.updateOne(
    { _id: shopIdOrObjectId },
    {
      $set: {
        'smsfeature.smsFeatureStatus': 'due',
      },
    },
  );
}

function buildSmsPackageInvoiceMessage({ receiptNumber, paymentAmount }) {
  const amountLabel = Number(paymentAmount).toLocaleString('en-LK');
  return (
    `Smart Cost: Your SMS package invoice (Receipt: ${receiptNumber}, Rs. ${amountLabel}) ` +
    `has been uploaded in Payments. Please pay within ${SMS_PAYMENT_DUE_DAYS} days to keep SMS active.`
  );
}

async function sendSmsPackageInvoiceSms(shop, { receiptNumber, paymentAmount }) {
  const mobile = shop.ownerMobileNumber?.trim();
  if (!mobile) {
    return { sent: false, reason: 'Owner mobile number is not set' };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildSmsPackageInvoiceMessage({ receiptNumber, paymentAmount }),
    });
    return { sent: true };
  } catch (error) {
    console.log('[sms-bill-cron] SMS failed for shop', shop.shopId, error.message);
    return { sent: false, reason: error.message || 'SMS send failed' };
  }
}

async function processShopForSmsBilling(shop, today) {
  const shopId = shop.shopId;
  const smsFeature = shop.smsfeature ?? {};

  if (!smsFeature.smsNextRenewalDate) {
    return { action: 'skipped', reason: 'no_sms_next_renewal_date' };
  }

  if (smsFeature.smsFeatureStatus !== 'active') {
    return {
      action: 'skipped',
      reason: 'sms_feature_not_active',
      smsFeatureStatus: smsFeature.smsFeatureStatus ?? null,
    };
  }

  const renewalDay = startOfDay(smsFeature.smsNextRenewalDate);
  if (!isRenewalDatePassed(renewalDay, today)) {
    return { action: 'skipped', reason: 'sms_renewal_date_not_due' };
  }

  const existingInvoice = await findExistingSmsInvoice(shopId, renewalDay);
  if (existingInvoice) {
    await markSmsFeatureDue(shop._id);

    return {
      action: 'skipped',
      reason: 'sms_invoice_already_exists',
      receiptNumber: existingInvoice.receiptNumber,
      paymentId: String(existingInvoice._id),
      smsFeatureStatus: 'due',
    };
  }

  const packageFee = findSmsPackageFee(smsFeature.smsPackageType);
  if (packageFee == null || packageFee <= 0) {
    return {
      action: 'error',
      reason: 'sms_package_fee_not_configured',
      smsPackageType: smsFeature.smsPackageType ?? null,
    };
  }

  const paymentMonth = getPaymentMonthFromDate(renewalDay);
  const receiptNumber = await generateSmsReceiptNumber(renewalDay);
  const description = formatSmsBillingDescription(renewalDay);

  const payment = await Payments.create({
    shopId,
    receiptNumber,
    receiptImagePath: UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
    paymentMonth,
    paymentAmount: packageFee,
    additionalPayments: [],
    paymentType: 'sms',
    subscriptionType: null,
    exactPaymentDay: renewalDay,
    expiryDate: null,
    status: 'notPaid',
    description,
  });

  await ShopsData.updateOne(
    { _id: shop._id },
    {
      $set: {
        'smsfeature.smsReceiptNo': String(payment._id),
        'smsfeature.smsFeatureStatus': 'due',
      },
    },
  );

  const sms = await sendSmsPackageInvoiceSms(shop, {
    receiptNumber,
    paymentAmount: packageFee,
  });

  return {
    action: 'invoiced',
    shopId,
    receiptNumber,
    paymentId: String(payment._id),
    paymentAmount: packageFee,
    paymentMonth,
    exactPaymentDay: renewalDay,
    description,
    smsPackageType: smsFeature.smsPackageType ?? null,
    smsFeatureStatus: 'due',
    smsSent: sms.sent,
    smsReason: sms.sent ? null : sms.reason,
  };
}

/**
 * Daily SMS billing job: for each shop with active SMS and a passed renewal date,
 * create a notPaid SMS invoice, mark smsFeatureStatus as due, and notify the owner by SMS.
 */

async function runDailySmsBillCheck(meta = {}) {
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
      'smsfeature.smsNextRenewalDate': { $ne: null, $lte: today },
      'smsfeature.smsFeatureStatus': 'active',
    })
      .select('shopId smsfeature ownerMobileNumber')
      .sort({ 'smsfeature.smsNextRenewalDate': 1 })
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

    console.log('[sms-bill-cron] Daily SMS invoice generation');
    console.log(
      `[sms-bill-cron] Summary: checked=${report.totalShopsChecked}, ` +
        `invoiced=${report.invoiced.length}, ` +
        `skipped=${report.skipped.length}, ` +
        `errors=${report.errors.length}`,
    );

    if (report.invoiced.length > 0) {
      console.log('[sms-bill-cron] Invoices created:', report.invoiced);
    }

    if (report.errors.length > 0) {
      console.log('[sms-bill-cron] Errors:', report.errors);
    }

    return report;
  } catch (error) {
    report.fatalError = error.message;
    report.errors.push({
      shopId: null,
      reason: error.message,
    });
    throw error;
  }
}

module.exports = {
  runDailySmsBillCheck,
  processShopForSmsBilling,
  isRenewalDatePassed,
};
