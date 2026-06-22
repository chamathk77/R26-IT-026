const mongoose = require('mongoose');

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
  },
  { timestamps: true },
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
});

customerSchema.index({ shopId: 1, mobileNumber: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
