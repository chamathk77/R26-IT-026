const mongoose = require('mongoose');

const smsDueDaysCronReportSchema = new mongoose.Schema(
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
    processedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    escalatedCount: {
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
        processed: [],
        escalated: [],
        skipped: [],
        errors: [],
      }),
    },
  },
  { timestamps: true },
);

smsDueDaysCronReportSchema.index({ checkedAt: -1 });

const SmsDueDaysCronReport = mongoose.model(
  'SmsDueDaysCronReport',
  smsDueDaysCronReportSchema,
);

module.exports = SmsDueDaysCronReport;
