const mongoose = require('mongoose');

const salePersonSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    salePersonId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true },
);

salePersonSchema.pre('validate', function normalizeSalePersonFields() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }
  if (this.salePersonId) {
    this.salePersonId = String(this.salePersonId).trim().toUpperCase();
  }
  if (this.firstName) {
    this.firstName = String(this.firstName).trim();
  }
  if (this.lastName) {
    this.lastName = String(this.lastName).trim();
  }
  if (this.position) {
    this.position = String(this.position).trim();
  }
  if (this.image === undefined || this.image === null) {
    this.image = '';
  } else {
    this.image = String(this.image).trim();
  }
});

salePersonSchema.index({ shopId: 1, salePersonId: 1 }, { unique: true });

module.exports = mongoose.model('SalePerson', salePersonSchema);
