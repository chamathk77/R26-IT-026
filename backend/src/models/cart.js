const mongoose = require('mongoose');

// 'manual' = customer QR order waiting for cashier review (not yet a POS cart).
const CART_STATUSES = ['pending', 'added', 'proceed', 'manual'];
const CART_ORDER_TYPES = ['takeaway', 'dine_in', 'delivery'];
const OPEN_TABLE_CART_STATUSES = ['pending', 'added'];
const MANUAL_CART_STATUS = 'manual';
const CART_SOURCES = ['pos', 'customer_qr'];
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
    /** POS owner of the cart. Null while a customer QR order waits for review. */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    serviceChargeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxBreakdown: {
      type: [
        {
          id: { type: String, trim: true },
          label: { type: String, trim: true },
          rate: { type: Number, min: 0 },
          amount: { type: Number, min: 0 },
        },
      ],
      default: [],
    },
    serviceChargeBreakdown: {
      type: [
        {
          id: { type: String, trim: true },
          label: { type: String, trim: true },
          type: { type: String, enum: ['percentage', 'fixed'] },
          value: { type: Number, min: 0 },
          amount: { type: Number, min: 0 },
        },
      ],
      default: [],
    },
    grandTotal: {
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
    /** 'pos' = staff created in app, 'customer_qr' = customer scanned the branch QR menu. */
    source: {
      type: String,
      enum: CART_SOURCES,
      default: 'pos',
      index: true,
    },
    /** Customer mobile entered on the QR menu before submitting. */
    customerPhone: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },
    /** Table number typed by the customer (kept even when no ShopTable matches it). */
    customerTableNumber: {
      type: String,
      default: '',
      trim: true,
    },
    /** Cashier who accepted the manual order into the normal POS flow. */
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

cartSchema.pre('validate', function normalizeCartFields() {
  // Only unreviewed customer QR orders may be ownerless.
  if (this.status !== MANUAL_CART_STATUS && !this.user) {
    throw new Error('user is required for POS carts');
  }

  if (this.customerPhone) {
    this.customerPhone = String(this.customerPhone).replace(/\D/g, '');
  }

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

// Manual order queue + badge count per branch.
cartSchema.index({ shopId: 1, branchId: 1, status: 1, createdAt: -1 });
// Customer "my orders today" lookup by mobile number.
cartSchema.index({ shopId: 1, branchId: 1, customerPhone: 1, createdAt: -1 });

const Cart = mongoose.model('Cart', cartSchema);

Cart.CART_STATUSES = CART_STATUSES;
Cart.CART_ORDER_TYPES = CART_ORDER_TYPES;
Cart.OPEN_TABLE_CART_STATUSES = OPEN_TABLE_CART_STATUSES;
Cart.MANUAL_CART_STATUS = MANUAL_CART_STATUS;
Cart.CART_SOURCES = CART_SOURCES;
Cart.BRANCH_ID_PATTERN = BRANCH_ID_PATTERN;

module.exports = Cart;
