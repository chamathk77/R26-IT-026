const mongoose = require('mongoose');

const smsBillCronReportSchema = new mongoose.Schema(
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
    invoicedCount: {
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
    smsSentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    smsFailedCount: {
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
        invoiced: [],
        skipped: [],
        errors: [],
      }),
    },
  },
  { timestamps: true },
);

smsBillCronReportSchema.index({ checkedAt: -1 });

const SmsBillCronReport = mongoose.model('SmsBillCronReport', smsBillCronReportSchema);

module.exports = SmsBillCronReport;
