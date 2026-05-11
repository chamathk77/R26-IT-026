const mongoose = require('mongoose');

const historyItemSchema = new mongoose.Schema(
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
  },
  { _id: false },
);

const historySchema = new mongoose.Schema(
  {
    handledUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cartSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    items: {
      type: [historyItemSchema],
      default: [],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    checkoutAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

historySchema.index({ handledUser: 1, checkoutAt: -1 });

const History = mongoose.model('History', historySchema);

module.exports = History;
