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
    isInventoryAvailable: { type: Boolean, default: false },
    barcode: { type: String, default: null, trim: true },
    qty: { type: Number, default: null, min: 0 },
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
    this.qty = null;
    this.barcode = null;
    this.cost = null;
  } else if (!this.isInventoryAvailable) {
    this.qty = null;
  }

  if (this.cost === undefined || this.cost === '' || Number.isNaN(Number(this.cost))) {
    this.cost = null;
  }

  if (this.barcode === undefined || this.barcode === null || String(this.barcode).trim() === '') {
    this.barcode = null;
  } else {
    this.barcode = String(this.barcode).trim();
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

module.exports = mongoose.model('Product', productSchema);
