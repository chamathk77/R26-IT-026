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
    barcode: { type: String, default: null, trim: true },
    productQty: { type: Number, default: 0, min: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

productSchema.pre('validate', function normalizeShopId() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }
});

productSchema.index({ shopId: 1, productName: 1 });
productSchema.index(
  { shopId: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: 'string', $nin: [null, ''] } } },
);

module.exports = mongoose.model('Product', productSchema);
