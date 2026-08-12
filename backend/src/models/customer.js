const mongoose = require('mongoose');

const pastOrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    productName: {
      type: String,
      trim: true,
    },
    qty: {
      type: Number,
      min: 1,
    },
    unitCost: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  { _id: false },
);

const pastOrderSchema = new mongoose.Schema(
  {
    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    cartNumber: {
      type: Number,
      min: 1,
    },
    branchId: {
      type: String,
      trim: true,
      uppercase: true,
    },
    checkOutTime: {
      type: Date,
      required: true,
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
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentOption: {
      type: String,
      trim: true,
      lowercase: true,
    },
    items: {
      type: [pastOrderItemSchema],
      default: [],
    },
    status: {
      type: String,
      default: 'submited',
      trim: true,
    },
  },
  { _id: false },
);

const customerSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      default: null,
      trim: true,
    },
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdate: {
      type: Date,
      default: Date.now,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    pastOrders: {
      type: [pastOrderSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

customerSchema.pre('validate', function normalizeCustomerFields() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }

  if (this.mobileNumber !== undefined && this.mobileNumber !== null) {
    this.mobileNumber = String(this.mobileNumber).replace(/\D/g, '').trim();
  }

  if (this.name !== undefined && this.name !== null) {
    const trimmedName = String(this.name).trim();
    this.name = trimmedName || null;
  }

  if (this.totalSales === undefined || this.totalSales === null || Number.isNaN(Number(this.totalSales))) {
    this.totalSales = 0;
  } else {
    this.totalSales = Math.max(0, Number(this.totalSales));
  }

  if (
    this.totalOrders === undefined ||
    this.totalOrders === null ||
    Number.isNaN(Number(this.totalOrders))
  ) {
    this.totalOrders = 0;
  } else {
    this.totalOrders = Math.max(0, Math.floor(Number(this.totalOrders)));
  }

  if (this.points === undefined || this.points === null || Number.isNaN(Number(this.points))) {
    this.points = 0;
  } else {
    this.points = Math.max(0, Number(this.points));
  }

  if (!this.lastUpdate) {
    this.lastUpdate = new Date();
  }

  if (!Array.isArray(this.pastOrders)) {
    this.pastOrders = [];
  }
});

customerSchema.index({ shopId: 1, mobileNumber: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
