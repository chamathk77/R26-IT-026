const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    colorCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: [/^#[0-9A-F]{6}$/, 'colorCode must be a valid hex color like #3B82F6'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
