const mongoose = require('mongoose');

const BRANCH_ID_PATTERN = /^BR\d{3,}$/;

const branchSchema = new mongoose.Schema(
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
    },
    branchName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    isMainBranch: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

branchSchema.pre('validate', function normalizeBranchFields() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }
  if (this.branchId) {
    this.branchId = String(this.branchId).trim().toUpperCase();
  }
  if (this.branchName) {
    this.branchName = String(this.branchName).trim();
  }
  if (this.address == null) {
    this.address = '';
  } else {
    this.address = String(this.address).trim();
  }
  if (this.phone == null) {
    this.phone = '';
  } else {
    this.phone = String(this.phone).trim();
  }
});

branchSchema.index({ shopId: 1, branchId: 1 }, { unique: true });
branchSchema.index({ shopId: 1, isActive: 1, isMainBranch: 1 });

const Branch = mongoose.model('Branch', branchSchema);

Branch.BRANCH_ID_PATTERN = BRANCH_ID_PATTERN;

module.exports = Branch;
