const Payments = require('../models/payments');

const UPFRONT_RECEIPT_PREFIX = 'U';

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

function formatPaymentRecord(payment) {
  return {
    _id: payment._id,
    shopId: payment.shopId,
    receiptNumber: payment.receiptNumber,
    receiptImagePath: payment.receiptImagePath,
    submittedDate: payment.submittedDate,
    paymentMonth: payment.paymentMonth ?? null,
    paymentAmount: payment.paymentAmount ?? null,
    paymentType: payment.paymentType,
    exactPaymentDay: payment.exactPaymentDay ?? null,
    status: payment.status,
    reason: payment.reason,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

module.exports = {
  generateUpFrontReceiptNumber,
  formatPaymentRecord,
  UPFRONT_INVOICE_IMAGE_PLACEHOLDER: 'pending-upload',
};
