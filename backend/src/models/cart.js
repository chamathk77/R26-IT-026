const mongoose = require('mongoose');

const CART_STATUSES = ['pending', 'added', 'proceed'];
const CART_ORDER_TYPES = ['takeaway', 'dine_in', 'delivery'];
const OPEN_TABLE_CART_STATUSES = ['pending', 'added'];
const BRANCH_ID_PATTERN = /^B\d{5}$/;

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    productNumber: {
      type: String,
      default: null,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    kitchenSentQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unitCost: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    cartNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: CART_STATUSES,
      default: 'pending',
    },
    isDiscount: {
      type: Boolean,
      default: false,
    },
    isDiscountPercentage: {
      type: Boolean,
      default: false,
    },
    isDiscountAmount: {
      type: Boolean,
      default: false,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderType: {
      type: String,
      enum: CART_ORDER_TYPES,
      default: null,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShopTable',
      default: null,
      index: true,
    },
    orderLabel: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true },
);

cartSchema.pre('validate', function normalizeCartFields() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }

  if (this.branchId) {
    this.branchId = String(this.branchId).trim().toUpperCase();
    if (!BRANCH_ID_PATTERN.test(this.branchId)) {
      throw new Error('branchId must match format B00001');
    }
  }
});

// One session per user per branch within a shop.
cartSchema.index({ shopId: 1, branchId: 1, user: 1, sessionId: 1 }, { unique: true });
// Cart #1, #2, ... unique per branch within a shop.
cartSchema.index({ shopId: 1, branchId: 1, cartNumber: 1 }, { unique: true });
cartSchema.index({ shopId: 1, branchId: 1, user: 1, status: 1 });
cartSchema.index(
  { shopId: 1, branchId: 1, tableId: 1, status: 1 },
  {
    name: 'shop_branch_table_open_cart',
    partialFilterExpression: {
      orderType: 'dine_in',
      tableId: { $type: 'objectId' },
      status: { $in: OPEN_TABLE_CART_STATUSES },
    },
  },
);

const Cart = mongoose.model('Cart', cartSchema);

Cart.CART_STATUSES = CART_STATUSES;
Cart.CART_ORDER_TYPES = CART_ORDER_TYPES;
Cart.OPEN_TABLE_CART_STATUSES = OPEN_TABLE_CART_STATUSES;
Cart.BRANCH_ID_PATTERN = BRANCH_ID_PATTERN;

module.exports = Cart;
