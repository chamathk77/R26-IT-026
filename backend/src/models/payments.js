const mongoose = require('mongoose');

const PAYMENT_MONTH_CODES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const PAYMENT_STATUS = ['pending', 'approve', 'rejected', 'notPaid']; 

const PAYMENT_TYPE = ['subscription', 'upFront'];

const paymentsSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    receiptNumber: {
      type: String,
      required: true,
      trim: true,
    },
    receiptImagePath: {
      type: String,
      required: true,
      trim: true,
    },
    submittedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMonth: {
      type: String,
      required: false,
      enum: PAYMENT_MONTH_CODES,
      lowercase: true,
      trim: true,
    },
    paymentType: {
      type: String,
      enum: PAYMENT_TYPE,
      default: 'subscription',
      trim: true,
    },
    exactPaymentDay: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUS,
      default: 'notPaid',
    },
    reason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true },
);

paymentsSchema.pre('validate', function validatePaymentRules() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }

  if (this.paymentMonth) {
    this.paymentMonth = String(this.paymentMonth).trim().toLowerCase();
  }

  if (this.paymentType) {
    const normalizedType = String(this.paymentType).trim();
    if (normalizedType === 'upfront') {
      this.paymentType = 'upFront';
    } else if (normalizedType === 'subscription') {
      this.paymentType = 'subscription';
    }
  }

  if (this.status === 'rejected') {
    if (!this.reason?.trim()) {
      this.invalidate('reason', 'Reason is required when payment status is rejected');
    }
  } else {
    this.reason = null;
  }

  if (this.status === 'approve' && !this.exactPaymentDay) {
    this.exactPaymentDay = new Date();
  }
});

paymentsSchema.index({ shopId: 1, paymentMonth: 1, submittedDate: -1 });
paymentsSchema.index({ shopId: 1, status: 1 });

const Payments = mongoose.model('Payments', paymentsSchema);

Payments.PAYMENT_MONTH_CODES = PAYMENT_MONTH_CODES;
Payments.PAYMENT_STATUS = PAYMENT_STATUS;
Payments.PAYMENT_TYPE = PAYMENT_TYPE;

module.exports = Payments;


/// below is the parameters for the payments model

// shopId
// receiptNumber
// receiptImagePath
// submittedDate
// paymentMonth (enum: january, february, march, april, may, june, july, august, september, october, november, december)
// paymentType: subscription, upFront
// exactPaymentDay
// status: pending, approve, rejected, notPaid
// reason





