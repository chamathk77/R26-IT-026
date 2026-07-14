const mongoose = require('mongoose');

/** Mobile app shop users only — dashboard staff use DashboardUser. */
const SHOP_ROLES = ['admin', 'owner', 'staff'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true, sparse: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: SHOP_ROLES,
      required: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    shopId: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
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
    otp: {
      type: Number,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const User = mongoose.model('User', userSchema);

User.SHOP_ROLES = SHOP_ROLES;

module.exports = User;
