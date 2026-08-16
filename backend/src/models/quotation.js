const mongoose = require('mongoose');

const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'expired', 'cancelled'];
const BRANCH_ID_PATTERN = /^B\d{5}$/;

const quotationItemSchema = new mongoose.Schema(
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
  },
  { _id: false },
);

const quotationSchema = new mongoose.Schema(
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
    quotationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 7,
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
    },
    items: {
      type: [quotationItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    isDiscount: {
      type: Boolean,
      default: false,
    },
    discountType: {
      type: String,
      enum: ['amount', 'percent'],
      default: 'amount',
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    includeTaxes: {
      type: Boolean,
      default: false,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxBreakdown: {
      type: [
        {
          id: { type: String, trim: true },
          label: { type: String, trim: true },
          rate: { type: Number, min: 0 },
          amount: { type: Number, min: 0 },
        },
      ],
      default: [],
    },
    billingSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: QUOTATION_STATUSES,
      default: 'draft',
      index: true,
    },
    validUntil: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

quotationSchema.pre('validate', function normalizeQuotationFields() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }

  if (this.branchId) {
    this.branchId = String(this.branchId).trim().toUpperCase();
    if (!BRANCH_ID_PATTERN.test(this.branchId)) {
      throw new Error('branchId must match format B00001');
    }
  }

  if (this.customerName == null) {
    this.customerName = '';
  }

  if (this.customerMobile == null) {
    this.customerMobile = '';
  }

  if (this.notes == null) {
    this.notes = '';
  }
});

quotationSchema.index({ shopId: 1, branchId: 1, createdAt: -1 });
quotationSchema.index({ shopId: 1, quotationNumber: 1 }, { unique: true });

module.exports = mongoose.model('Quotation', quotationSchema);
module.exports.QUOTATION_STATUSES = QUOTATION_STATUSES;
