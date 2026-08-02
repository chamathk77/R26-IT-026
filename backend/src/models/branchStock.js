const mongoose = require('mongoose');

const BRANCH_ID_PATTERN = /^B\d{5}$/;

const branchStockSchema = new mongoose.Schema(
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
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    qty: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

branchStockSchema.pre('validate', function normalizeBranchStockFields() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }

  if (this.branchId) {
    this.branchId = String(this.branchId).trim().toUpperCase();
    if (!BRANCH_ID_PATTERN.test(this.branchId)) {
      throw new Error('branchId must match format B00001');
    }
  }

  if (this.qty == null || this.qty === '' || Number.isNaN(Number(this.qty))) {
    this.qty = 0;
  } else {
    this.qty = Number(this.qty);
  }
});

branchStockSchema.index({ shopId: 1, branchId: 1, productId: 1 }, { unique: true });
branchStockSchema.index({ shopId: 1, productId: 1 });
branchStockSchema.index({ shopId: 1, branchId: 1 });

module.exports = mongoose.model('BranchStock', branchStockSchema);
