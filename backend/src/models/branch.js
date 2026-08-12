const mongoose = require('mongoose');

const BRANCH_ID_PATTERN = /^B\d{5}$/;

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
      unique: true,
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

async function generateNextBranchId() {
  const BranchModel = mongoose.model('Branch');
  const lastBranch = await BranchModel.findOne(
    { branchId: /^B\d{5}$/i },
    { branchId: 1 },
  )
    .sort({ branchId: -1 })
    .lean();

  if (!lastBranch?.branchId) {
    return 'B00001';
  }

  const match = String(lastBranch.branchId).match(/^B(\d{5})$/i);
  const nextNumber = match ? Number.parseInt(match[1], 10) + 1 : 1;
  return `B${String(nextNumber).padStart(5, '0')}`;
}

branchSchema.pre('validate', async function assignBranchId() {
  if (this.branchId) {
    this.branchId = String(this.branchId).trim().toUpperCase();
    if (!BRANCH_ID_PATTERN.test(this.branchId)) {
      throw new Error('branchId must match format B00001');
    }
    return;
  }

  this.branchId = await generateNextBranchId();
});

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
Branch.generateNextBranchId = generateNextBranchId;

module.exports = Branch;
