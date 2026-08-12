const mongoose = require('mongoose');

const BRANCH_ID_PATTERN = /^B\d{5}$/;

const shopTableSchema = new mongoose.Schema(
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
    tableNumber: {
      type: String,
      required: true,
      trim: true,
    },
    tableName: {
      type: String,
      default: '',
      trim: true,
    },
    capacity: {
      type: Number,
      default: null,
      min: 1,
    },
    zone: {
      type: String,
      default: '',
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

shopTableSchema.pre('validate', function normalizeShopTableFields() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }

  if (this.branchId) {
    this.branchId = String(this.branchId).trim().toUpperCase();
    if (!BRANCH_ID_PATTERN.test(this.branchId)) {
      throw new Error('branchId must match format B00001');
    }
  }

  if (this.tableNumber != null) {
    this.tableNumber = String(this.tableNumber).trim();
    if (!this.tableNumber) {
      throw new Error('tableNumber is required');
    }
  }

  if (this.tableName == null) {
    this.tableName = '';
  } else {
    this.tableName = String(this.tableName).trim();
  }

  if (this.zone == null) {
    this.zone = '';
  } else {
    this.zone = String(this.zone).trim();
  }

  if (this.capacity === undefined || this.capacity === null || this.capacity === '') {
    this.capacity = null;
  } else {
    const parsed = Number(this.capacity);
    if (Number.isNaN(parsed) || parsed < 1) {
      throw new Error('capacity must be a positive number');
    }
    this.capacity = parsed;
  }

  if (this.sortOrder === undefined || this.sortOrder === null || this.sortOrder === '') {
    this.sortOrder = 0;
  } else {
    const parsed = Number(this.sortOrder);
    this.sortOrder = Number.isNaN(parsed) ? 0 : parsed;
  }
});

shopTableSchema.index(
  { shopId: 1, branchId: 1, tableNumber: 1 },
  { unique: true, name: 'shop_branch_tableNumber_unique' },
);
shopTableSchema.index({ shopId: 1, branchId: 1, isActive: 1, sortOrder: 1 });

const ShopTable = mongoose.model('ShopTable', shopTableSchema);

ShopTable.BRANCH_ID_PATTERN = BRANCH_ID_PATTERN;

module.exports = ShopTable;
