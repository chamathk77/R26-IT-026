const mongoose = require('mongoose');

const PAYMENT_OPTIONS = ['cash', 'card', 'online'];
const HISTORY_STATUS_OPTIONS = ['submited', 'reversed', 'canceled'];
const BRANCH_ID_PATTERN = /^B\d{5}$/;

const historyItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    unitCost: {
      type: Number,
      default: null,
      min: 0,
    },
    /** Snapshot at checkout when product had warranty. */
    warrantyMonths: {
      type: Number,
      default: null,
      min: 1,
    },
    warrantyExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const historySchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    branchId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    cartNumber: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 6,
      index: true,
    },
    checkOutTime: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    isDiscount: {
      type: Boolean,
      default: false,
    },
    discountedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    items: {
      type: [historyItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },
    customerMobile: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    isSmsSent: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    submittedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    submittedUserName: {
      type: String,
      required: true,
      trim: true,
    },
    paymentOption: {
      type: String,
      enum: PAYMENT_OPTIONS,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: HISTORY_STATUS_OPTIONS,
      default: 'submited',
      index: true,
    },
    isReversed: {
      type: Boolean,
      default: false,
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    reversedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reversedUserName: {
      type: String,
      default: null,
    },
    salesPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalePerson',
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

historySchema.pre('validate', function normalizeHistoryFields() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }
  if (this.branchId) {
    this.branchId = String(this.branchId).trim().toUpperCase();
    if (!BRANCH_ID_PATTERN.test(this.branchId)) {
      throw new Error('branchId must match format B00001');
    }
  }
  if (this.orderId) {
    this.orderId = String(this.orderId).trim().toUpperCase();
  }
});

historySchema.index({ shopId: 1, branchId: 1, checkOutTime: -1 });
historySchema.index({ shopId: 1, branchId: 1, cartNumber: 1 });
historySchema.index({ shopId: 1, branchId: 1, paymentOption: 1, checkOutTime: -1 });
historySchema.index({ shopId: 1, branchId: 1, submittedUserId: 1, checkOutTime: -1 });
historySchema.index({ shopId: 1, branchId: 1, cartId: 1 }, { unique: true });
historySchema.index({ shopId: 1, branchId: 1, orderId: 1 }, { unique: true });

const History = mongoose.model('History', historySchema);

History.PAYMENT_OPTIONS = PAYMENT_OPTIONS;
History.HISTORY_STATUS_OPTIONS = HISTORY_STATUS_OPTIONS;
History.BRANCH_ID_PATTERN = BRANCH_ID_PATTERN;

module.exports = History;
