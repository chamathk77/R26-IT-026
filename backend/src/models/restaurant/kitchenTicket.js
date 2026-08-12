const mongoose = require('mongoose');

const KITCHEN_TICKET_STATUSES = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
const OPEN_KITCHEN_TICKET_STATUSES = ['pending', 'preparing', 'ready'];
const CART_ORDER_TYPES = ['takeaway', 'dine_in', 'delivery'];
const BRANCH_ID_PATTERN = /^B\d{5}$/;

const kitchenTicketItemSchema = new mongoose.Schema(
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
    },
  },
  { _id: false },
);

const kitchenTicketSchema = new mongoose.Schema(
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
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    cartNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    ticketNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    orderType: {
      type: String,
      enum: CART_ORDER_TYPES,
      default: null,
    },
    orderLabel: {
      type: String,
      default: '',
      trim: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShopTable',
      default: null,
    },
    items: {
      type: [kitchenTicketItemSchema],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'Kitchen ticket must include at least one item',
      },
    },
    status: {
      type: String,
      enum: KITCHEN_TICKET_STATUSES,
      default: 'pending',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

kitchenTicketSchema.pre('validate', function normalizeKitchenTicketFields() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }
  if (this.branchId) {
    this.branchId = String(this.branchId).trim().toUpperCase();
    if (!BRANCH_ID_PATTERN.test(this.branchId)) {
      throw new Error('branchId must match format B00001');
    }
  }
  if (this.orderLabel == null) {
    this.orderLabel = '';
  } else {
    this.orderLabel = String(this.orderLabel).trim();
  }
});

kitchenTicketSchema.index({ shopId: 1, branchId: 1, ticketNumber: 1 }, { unique: true });
kitchenTicketSchema.index({ shopId: 1, branchId: 1, status: 1, createdAt: -1 });
kitchenTicketSchema.index({ shopId: 1, branchId: 1, sessionId: 1, createdAt: -1 });

const KitchenTicket = mongoose.model('KitchenTicket', kitchenTicketSchema);

KitchenTicket.KITCHEN_TICKET_STATUSES = KITCHEN_TICKET_STATUSES;
KitchenTicket.OPEN_KITCHEN_TICKET_STATUSES = OPEN_KITCHEN_TICKET_STATUSES;
KitchenTicket.BRANCH_ID_PATTERN = BRANCH_ID_PATTERN;

module.exports = KitchenTicket;
