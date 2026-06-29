const mongoose = require('mongoose');

const dueDaysCronReportSchema = new mongoose.Schema(
  {
    reportDate: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
      unique: true,
    },
    checkedAt: {
      type: Date,
      required: true,
    },
    schedule: {
      type: String,
      default: null,
      trim: true,
    },
    timezone: {
      type: String,
      default: null,
      trim: true,
    },
    totalShopsChecked: {
      type: Number,
      default: 0,
      min: 0,
    },
    subscriptionProcessedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    subscriptionStatusChangedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    smsProcessedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    smsStatusChangedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    skippedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    errorsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    runStatus: {
      type: String,
      enum: ['success', 'partial', 'failed'],
      default: 'success',
    },
    fatalError: {
      type: String,
      default: null,
      trim: true,
    },
    reportData: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        subscription: [],
        sms: [],
        skipped: [],
        errors: [],
      }),
    },
  },
  { timestamps: true },
);

dueDaysCronReportSchema.index({ checkedAt: -1 });

const DueDaysCronReport = mongoose.model('DueDaysCronReport', dueDaysCronReportSchema);

module.exports = DueDaysCronReport;
