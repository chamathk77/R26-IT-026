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

const PAYMENT_TYPE = ['subscription', 'upFront', 'sms'];

const SUBSCRIPTION_TYPES = ['1month', '3months', '6months', '1year'];

const additionalPaymentItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

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
      default: 'pending-upload',
      trim: true,
    },
    submittedDate: {
      type: Date,
      default: null,
    },
    paymentMonth: {
      type: String,
      required: false,
      enum: PAYMENT_MONTH_CODES,
      lowercase: true,
      trim: true,
    },
    paymentAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    additionalPayments: {
      type: [additionalPaymentItemSchema],
      default: [],
    },
    paymentType: {
      type: String,
      enum: PAYMENT_TYPE,
      default: 'subscription',
      trim: true,
    },
    IsOnboaringPayment: {
      type: Boolean,
      default: false,
    },
    subscriptionType: {
      type: String,
      default: null,
      validate: {
        validator(value) {
          return value == null || SUBSCRIPTION_TYPES.includes(value);
        },
        message: 'subscriptionType must be one of: 1month, 3months, 6months, 1year',
      },
    },
    exactPaymentDay: {
      type: Date,
      default: null,
    },
    expiryDate: {
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
    description: {
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
    } else if (normalizedType === 'sms') {
      this.paymentType = 'sms';
    }
  }

  if (this.paymentType === 'upFront' || this.paymentType === 'sms') {
    this.subscriptionType = null;
  }

  if (this.paymentType === 'subscription' && this.subscriptionType) {
    this.subscriptionType = String(this.subscriptionType).trim();
  }

  if (this.status === 'rejected') {
    if (!this.reason?.trim()) {
      this.invalidate('reason', 'Reason is required when payment status is rejected');
    }
  } else {
    this.reason = null;
  }

  if (['pending', 'approve'].includes(this.status) && !this.submittedDate) {
    this.invalidate(
      'submittedDate',
      'Submitted date is required when payment status is pending or approved',
    );
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
Payments.SUBSCRIPTION_TYPES = SUBSCRIPTION_TYPES;

module.exports = Payments;


/// below is the parameters for the payments model

// shopId
// receiptNumber
// receiptImagePath
// submittedDate (set when receipt is uploaded; null for notPaid invoices)
// paymentMonth (enum: january, february, march, april, may, june, july, august, september, october, november, december)
// paymentAmount
// additionalPayments: [{ name, amount }]
// paymentType: subscription, upFront, sms
// IsOnboaringPayment: boolean
// subscriptionType: 1month | 3months | 6months | 1year | null
// exactPaymentDay
// expiryDate
// status: pending, approve, rejected, notPaid
// reason
// description





