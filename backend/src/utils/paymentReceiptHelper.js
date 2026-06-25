const Payments = require('../models/payments');

const UPFRONT_RECEIPT_PREFIX = 'U';
const PLAN_SUBSCRIPTION_RECEIPT_PREFIX = 'S';

const MONTH_RECEIPT_LETTER = {
  january: 'A',
  february: 'F',
  march: 'M',
  april: 'P',
  may: 'Y',
  june: 'J',
  july: 'L',
  august: 'G',
  september: 'S',
  october: 'O',
  november: 'N',
  december: 'D',
};

function getPaymentMonthFromDate(date) {
  return Payments.PAYMENT_MONTH_CODES[new Date(date).getMonth()];
}

async function generateUpFrontReceiptNumber(referenceDate = new Date()) {
  const yearSuffix = String(referenceDate.getFullYear()).slice(-2);
  const prefix = `${UPFRONT_RECEIPT_PREFIX}${yearSuffix}`;
  const receiptPattern = new RegExp(`^${prefix}\\d{6}$`);

  const latest = await Payments.findOne({ receiptNumber: receiptPattern })
    .sort({ receiptNumber: -1 })
    .lean();

  let sequence = 1;
  if (latest?.receiptNumber) {
    sequence = Number.parseInt(latest.receiptNumber.slice(3), 10) + 1;
  }

  if (sequence > 999999) {
    throw new Error('Up-front receipt number sequence limit reached for this year');
  }

  return `${prefix}${String(sequence).padStart(6, '0')}`;
}

async function generatePlanSubscriptionReceiptNumber(referenceDate = new Date()) {
  const yearSuffix = String(referenceDate.getFullYear()).slice(-2);
  const prefix = `${PLAN_SUBSCRIPTION_RECEIPT_PREFIX}${yearSuffix}`;
  const receiptPattern = new RegExp(`^${prefix}\\d{6}$`);

  const latest = await Payments.findOne({ receiptNumber: receiptPattern })
    .sort({ receiptNumber: -1 })
    .lean();

  let sequence = 1;
  if (latest?.receiptNumber) {
    sequence = Number.parseInt(latest.receiptNumber.slice(3), 10) + 1;
  }

  if (sequence > 999999) {
    throw new Error('Plan subscription receipt number sequence limit reached for this year');
  }

  return `${prefix}${String(sequence).padStart(6, '0')}`;
}

async function generateSubscriptionReceiptNumber(paymentMonth, referenceDate = new Date()) {
  const monthLetter = MONTH_RECEIPT_LETTER[paymentMonth];
  if (!monthLetter) {
    throw new Error(`Invalid payment month for receipt number: ${paymentMonth}`);
  }

  const yearSuffix = String(referenceDate.getFullYear()).slice(-2);
  const prefix = `${monthLetter}${yearSuffix}`;
  const receiptPattern = new RegExp(`^${prefix}\\d{6}$`);

  const latest = await Payments.findOne({ receiptNumber: receiptPattern })
    .sort({ receiptNumber: -1 })
    .lean();

  let sequence = 1;
  if (latest?.receiptNumber) {
    sequence = Number.parseInt(latest.receiptNumber.slice(3), 10) + 1;
  }

  if (sequence > 999999) {
    throw new Error('Receipt number sequence limit reached for this month');
  }

  return `${prefix}${String(sequence).padStart(6, '0')}`;
}

function formatPaymentRecord(payment) {
  return {
    _id: payment._id,
    shopId: payment.shopId,
    receiptNumber: payment.receiptNumber,
    receiptImagePath: payment.receiptImagePath,
    submittedDate: payment.submittedDate,
    paymentMonth: payment.paymentMonth ?? null,
    paymentAmount: payment.paymentAmount ?? null,
    additionalPayments: Array.isArray(payment.additionalPayments)
      ? payment.additionalPayments.map((item) => ({
          name: item.name,
          amount: item.amount,
        }))
      : [],
    paymentType: payment.paymentType,
    subscriptionType: payment.subscriptionType ?? null,
    exactPaymentDay: payment.exactPaymentDay ?? null,
    expiryDate: payment.expiryDate ?? null,
    status: payment.status,
    reason: payment.reason,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

module.exports = {
  generateUpFrontReceiptNumber,
  generatePlanSubscriptionReceiptNumber,
  generateSubscriptionReceiptNumber,
  getPaymentMonthFromDate,
  formatPaymentRecord,
  UPFRONT_INVOICE_IMAGE_PLACEHOLDER: 'pending-upload',
};
