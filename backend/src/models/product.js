const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    productName: { type: String, required: true, trim: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    categoryName: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['product', 'service'],
      default: 'product',
      required: true,
    },
    // Selling price. Required for product; null/0 for service (entered at cart/checkout).
    amount: { type: Number, default: null, min: 0 },
    // Optional unit cost (e.g. for margin tracking). May be null.
    cost: { type: Number, default: null, min: 0 },
    // Catalog flag only — branch qty lives in BranchStock.
    isInventoryAvailable: { type: Boolean, default: false },
    barcode: { type: String, default: null, trim: true },
    /** Menu / POS code (e.g. 101). Optional; unique per shop when set. */
    productNumber: { type: String, default: null, trim: true },
    /** When shop warrantyModule is on — product eligible for warranty tracking. */
    warrantyAvailable: { type: Boolean, default: false },
    /** Warranty period in months when warrantyAvailable is true. */
    warrantyMonths: { type: Number, default: null, min: 1 },
    image: { type: String, default: '', trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

productSchema.pre('validate', function normalizeProductFields() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }

  if (this.type === 'service') {
    this.isInventoryAvailable = false;
    this.amount = null;
    this.barcode = null;
    this.cost = null;
    this.warrantyAvailable = false;
    this.warrantyMonths = null;
  }

  if (!this.warrantyAvailable) {
    this.warrantyMonths = null;
  } else if (
    this.warrantyMonths !== null &&
    this.warrantyMonths !== undefined &&
    this.warrantyMonths !== ''
  ) {
    const months = Number(this.warrantyMonths);
    this.warrantyMonths = Number.isFinite(months) && months >= 1 ? months : null;
  }

  if (this.cost === undefined || this.cost === '' || Number.isNaN(Number(this.cost))) {
    this.cost = null;
  }

  if (this.barcode === undefined || this.barcode === null || String(this.barcode).trim() === '') {
    this.barcode = null;
  } else {
    this.barcode = String(this.barcode).trim();
  }

  if (
    this.productNumber === undefined ||
    this.productNumber === null ||
    String(this.productNumber).trim() === ''
  ) {
    this.productNumber = null;
  } else {
    this.productNumber = String(this.productNumber).trim();
  }
});

productSchema.index({ shopId: 1, productName: 1 });
productSchema.index(
  { shopId: 1, barcode: 1 },
  {
    unique: true,
    name: 'shopId_barcode_unique_when_set',
    partialFilterExpression: {
      barcode: { $exists: true, $type: 'string', $gt: '' },
    },
  },
);
productSchema.index(
  { shopId: 1, productNumber: 1 },
  {
    unique: true,
    name: 'shopId_productNumber_unique_when_set',
    partialFilterExpression: {
      productNumber: { $exists: true, $type: 'string', $gt: '' },
    },
  },
);

module.exports = mongoose.model('Product', productSchema);
