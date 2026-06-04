const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true, sparse: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'owner', 'staff'],
      required: true,
    },
    shopId: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      index: true,
    },
    isFirsttimeLogin: {
      type: Boolean,
      default: true,
    },
    token: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);