const mongoose = require('mongoose');

const BRANCH_ID_PATTERN = /^B\d{5}$/;

const costExpenseSchema = new mongoose.Schema(
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
      index: true,
    },
    expenseId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 6,
    },
    expenseName: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCategory',
      required: true,
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    isProduct: {
      type: Boolean,
      default: false,
      required: true,
    },
    qty: {
      type: Number,
      default: null,
      min: 0,
    },
    image: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

costExpenseSchema.pre('validate', function normalizeCostExpenseFields() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }

  if (this.branchId) {
    this.branchId = String(this.branchId).trim().toUpperCase();
    if (!BRANCH_ID_PATTERN.test(this.branchId)) {
      throw new Error('branchId must match format B00001');
    }
  }

  if (!this.purchaseDate) {
    this.purchaseDate = new Date();
  }

  if (!this.isProduct) {
    this.qty = null;
  } else if (this.qty === undefined || this.qty === '' || Number.isNaN(Number(this.qty))) {
    this.qty = null;
  }

  if (this.image === undefined || this.image === null) {
    this.image = '';
  } else {
    this.image = String(this.image).trim();
  }
});

costExpenseSchema.index({ shopId: 1, branchId: 1, purchaseDate: -1 });
costExpenseSchema.index({ shopId: 1, branchId: 1, categoryId: 1 });
costExpenseSchema.index({ shopId: 1, expenseId: 1 }, { unique: true });

module.exports = mongoose.model('CostExpense', costExpenseSchema);
