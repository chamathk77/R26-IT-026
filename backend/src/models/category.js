const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    colorCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: [/^#[0-9A-F]{6}$/, 'colorCode must be a valid hex color like #3B82F6'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

categorySchema.pre('validate', function normalizeShopId() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }
});

categorySchema.index({ shopId: 1, name: 1 });

module.exports = mongoose.model('Category', categorySchema);
