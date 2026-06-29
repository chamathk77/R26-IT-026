const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true, sparse: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'owner', 'staff', 'internalAdmin', 'internalStaff'],
      required: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    isInternalUser: {
      type: Boolean,
      default: false,
      index: true,
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
    otp: {
      type: Number,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);