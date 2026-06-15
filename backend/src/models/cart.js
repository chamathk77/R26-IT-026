const mongoose = require('mongoose');

const CART_STATUSES = ['pending', 'added', 'proceed'];

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
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
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
  },
  { timestamps: true },
);

cartSchema.pre('validate', function normalizeShopId() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }
});

cartSchema.index({ shopId: 1, user: 1, sessionId: 1 }, { unique: true });
// cartNumber must be unique within the same shop (Cart #1, #2, ... per shopId).
cartSchema.index({ shopId: 1, cartNumber: 1 }, { unique: true });
cartSchema.index({ shopId: 1, user: 1, status: 1 });

const Cart = mongoose.model('Cart', cartSchema);

Cart.CART_STATUSES = CART_STATUSES;

module.exports = Cart;
