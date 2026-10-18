const mongoose = require('mongoose');

const VALID_SEGMENTS = ['VIP / Loyal', 'Regular', 'Occasional', 'At Risk / Lapsed'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_STATUSES = ['Planned', 'In Progress', 'Completed'];

function normalizeSegment(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (s.toLowerCase() === 'at risk / lapsed' || s.toLowerCase() === 'at-risk / lapsed') {
    return 'At Risk / Lapsed';
  }
  return s;
}

const customerBehaviorActionSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    targetSegment: {
      type: String,
      required: true,
      enum: VALID_SEGMENTS,
    },
    priority: {
      type: String,
      required: true,
      enum: VALID_PRIORITIES,
      default: 'Medium',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: VALID_STATUSES,
      default: 'Planned',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdByName: {
      type: String,
      trim: true,
      default: '',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

customerBehaviorActionSchema.pre('validate', function preValidate() {
  if (this.shopId) {
    this.shopId = String(this.shopId).trim().toUpperCase();
  }
  if (this.branchId) {
    this.branchId = String(this.branchId).trim().toUpperCase();
  }
  if (this.targetSegment) {
    this.targetSegment = normalizeSegment(this.targetSegment);
  }
  if (this.endDate && !this.dueDate) {
    this.dueDate = this.endDate;
  }
  if (this.dueDate && !this.endDate) {
    this.endDate = this.dueDate;
  }
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    throw new Error('endDate cannot be earlier than startDate');
  }

  // Automatic date-based lifecycle progression:
  // When end date arrives or passes -> Completed
  // When planned start date arrives (and end date in future or null) -> In Progress
  const now = new Date();
  const effectiveEnd = this.endDate || this.dueDate;
  if (effectiveEnd && effectiveEnd <= now) {
    this.status = 'Completed';
  } else if (this.startDate && this.startDate <= now) {
    if (this.status === 'Planned') {
      this.status = 'In Progress';
    }
  }
});

customerBehaviorActionSchema.index({ shopId: 1, branchId: 1, createdAt: -1 });
customerBehaviorActionSchema.index({ shopId: 1, status: 1 });
customerBehaviorActionSchema.index({ shopId: 1, targetSegment: 1 });

module.exports = mongoose.model('CustomerBehaviorAction', customerBehaviorActionSchema);
