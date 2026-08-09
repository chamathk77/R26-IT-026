const mongoose = require('mongoose');

const bulkImportFailedRowSchema = new mongoose.Schema(
  {
    rowNumber: { type: Number, required: true, min: 1 },
    productName: { type: String, default: '' },
    categoryName: { type: String, default: '' },
    type: { type: String, default: '' },
    amount: { type: mongoose.Schema.Types.Mixed, default: '' },
    cost: { type: mongoose.Schema.Types.Mixed, default: '' },
    isInventoryAvailable: { type: mongoose.Schema.Types.Mixed, default: '' },
    openingQty: { type: mongoose.Schema.Types.Mixed, default: '' },
    barcode: { type: String, default: '' },
    errors: { type: [String], default: [] },
  },
  { _id: false },
);

const bulkImportCategoryCreatedSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: { type: String, required: true, trim: true },
    colorCode: { type: String, required: true, trim: true, uppercase: true },
  },
  { _id: false },
);

const bulkImportSummarySchema = new mongoose.Schema(
  {
    totalRows: { type: Number, required: true, min: 0 },
    imported: { type: Number, required: true, min: 0 },
    failed: { type: Number, required: true, min: 0 },
    categoriesCreated: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const bulkProductImportResultSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    importedByName: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: bulkImportSummarySchema,
      required: true,
    },
    categoriesCreated: {
      type: [bulkImportCategoryCreatedSchema],
      default: [],
    },
    failedRows: {
      type: [bulkImportFailedRowSchema],
      default: [],
    },
  },
  { timestamps: true },
);

bulkProductImportResultSchema.pre('validate', function normalizeShopId() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }
});

module.exports = mongoose.model('BulkProductImportResult', bulkProductImportResultSchema);
