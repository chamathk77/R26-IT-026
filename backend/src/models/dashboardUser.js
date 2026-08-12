const mongoose = require('mongoose');

const DASHBOARD_ROLES = ['admin', 'staff'];

const dashboardUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: DASHBOARD_ROLES,
      required: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    token: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

dashboardUserSchema.pre('validate', function normalizeDashboardUserFields() {
  if (this.name) {
    this.name = String(this.name).trim();
  }
  if (this.email) {
    this.email = String(this.email).trim().toLowerCase();
  }
  if (this.phone) {
    this.phone = String(this.phone).trim();
  }
  if (this.note == null) {
    this.note = '';
  } else {
    this.note = String(this.note).trim();
  }
});

const DashboardUser = mongoose.model('DashboardUser', dashboardUserSchema);

DashboardUser.DASHBOARD_ROLES = DASHBOARD_ROLES;

module.exports = DashboardUser;
