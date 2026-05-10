const mongoose = require('mongoose');
const Category = require('../models/category');

function invalidIdResponse(res) {
  return res.status(400).json({ message: 'Invalid category id', success: false });
}

function isValidHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(value).trim());
}

const createCategory = async (req, res) => {
  try {
    const { name, description, colorCode } = req.body;

    if (name === undefined || String(name).trim() === '') {
      return res.status(400).json({ message: 'Name is required', success: false });
    }
    if (description === undefined || String(description).trim() === '') {
      return res.status(400).json({ message: 'Description is required', success: false });
    }
    if (colorCode === undefined || String(colorCode).trim() === '') {
      return res.status(400).json({ message: 'Color code is required', success: false });
    }
    if (!isValidHexColor(colorCode)) {
      return res
        .status(400)
        .json({ message: 'Color code must be a valid hex value like #3B82F6', success: false });
    }

    const category = await Category.create({
      name: String(name).trim(),
      description: String(description).trim(),
      colorCode: String(colorCode).trim().toUpperCase(),
      createdBy: req.user.id,
    });

    const populated = await Category.findById(category._id).populate('createdBy', 'name email role');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};

const getCategories = async (_req, res) => {
  try {
    const categories = await Category.find()
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const category = await Category.findById(id).populate('createdBy', 'name email role');
    if (!category) {
      return res.status(404).json({ message: 'Category not found', success: false });
    }

    return res.json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const { name, description, colorCode } = req.body;
    const updates = {};

    if (name !== undefined) {
      const nameTrimmed = String(name).trim();
      if (nameTrimmed === '') {
        return res.status(400).json({ message: 'Name cannot be empty', success: false });
      }
      updates.name = nameTrimmed;
    }

    if (description !== undefined) {
      const descriptionTrimmed = String(description).trim();
      if (descriptionTrimmed === '') {
        return res.status(400).json({ message: 'Description cannot be empty', success: false });
      }
      updates.description = descriptionTrimmed;
    }

    if (colorCode !== undefined) {
      const colorTrimmed = String(colorCode).trim();
      if (colorTrimmed === '') {
        return res.status(400).json({ message: 'Color code cannot be empty', success: false });
      }
      if (!isValidHexColor(colorTrimmed)) {
        return res
          .status(400)
          .json({ message: 'Color code must be a valid hex value like #3B82F6', success: false });
      }
      updates.colorCode = colorTrimmed.toUpperCase();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update', success: false });
    }

    const category = await Category.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email role');

    if (!category) {
      return res.status(404).json({ message: 'Category not found', success: false });
    }

    return res.json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found', success: false });
    }

    return res.json({ success: true, message: 'Category removed', id: category._id });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
