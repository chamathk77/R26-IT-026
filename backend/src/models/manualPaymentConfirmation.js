const mongoose = require('mongoose');

const manualPaymentConfirmationSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    shopMobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    paymentAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      default: 'Manual',
      trim: true,
    },
    paymentReceivedDate: {
      type: Date,
      default: () => new Date(),
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    notes: {
      type: String,
      default: null,
      trim: true,
    },
    generatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DashboardUser',
      default: null,
    },
    generatedByName: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true },
);

manualPaymentConfirmationSchema.pre('validate', function normalizeFields() {
  if (this.productName) this.productName = String(this.productName).trim();
  if (this.shopName) this.shopName = String(this.shopName).trim();
  if (this.address) this.address = String(this.address).trim();
  if (this.shopMobileNumber) this.shopMobileNumber = String(this.shopMobileNumber).trim();
  if (this.paymentMethod) this.paymentMethod = String(this.paymentMethod).trim();
  if (this.description) this.description = String(this.description).trim();
  if (this.notes) this.notes = String(this.notes).trim();
  if (this.generatedByName) this.generatedByName = String(this.generatedByName).trim();
});

const ManualPaymentConfirmation = mongoose.model(
  'ManualPaymentConfirmation',
  manualPaymentConfirmationSchema,
);

module.exports = ManualPaymentConfirmation;
