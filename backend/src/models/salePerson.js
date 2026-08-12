const mongoose = require('mongoose');

const BRANCH_ID_PATTERN = /^B\d{5}$/;

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
    allowedBranchIds: {
      type: [String],
      default: [],
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
  if (Array.isArray(this.allowedBranchIds)) {
    const normalized = [
      ...new Set(
        this.allowedBranchIds
          .map((branchId) => String(branchId ?? '').trim().toUpperCase())
          .filter(Boolean),
      ),
    ];

    for (const branchId of normalized) {
      if (!BRANCH_ID_PATTERN.test(branchId)) {
        throw new Error('allowedBranchIds must use branch format B00001');
      }
    }

    this.allowedBranchIds = normalized;
  } else {
    this.allowedBranchIds = [];
  }
  if (this.image === undefined || this.image === null) {
    this.image = '';
  } else {
    this.image = String(this.image).trim();
  }
});

salePersonSchema.index({ shopId: 1, salePersonId: 1 }, { unique: true });
salePersonSchema.index({ shopId: 1, allowedBranchIds: 1 });

module.exports = mongoose.model('SalePerson', salePersonSchema);
