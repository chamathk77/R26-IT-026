const mongoose = require('mongoose');
const Category = require('../models/category');
const User = require('../models/user');

const CATEGORY_CREATOR_ROLES = ['admin', 'owner'];

function invalidIdResponse(res) {
  return res.status(400).json({ message: 'Invalid category id', success: false });
}

function isValidHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(value).trim());
}

function getRequestShopId(req) {
  return req.user?.shopId ? String(req.user.shopId).trim().toUpperCase() : '';
}

async function getCategoryManagerContext(userId) {
  const user = await User.findById(userId).select('role shopId').lean();
  if (!user) {
    return { error: { status: 401, message: 'Not authorized, user not found' } };
  }
  if (!CATEGORY_CREATOR_ROLES.includes(user.role)) {
    return { error: { status: 403, message: 'Only admin and owner can manage categories' } };
  }
  const shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
  if (!shopId) {
    return { error: { status: 400, message: 'Shop id is required' } };
  }
  return { shopId };
}

const createCategory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name role shopId').lean();
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found', success: false });
    }

    if (!CATEGORY_CREATOR_ROLES.includes(user.role)) {
      return res.status(403).json({
        message: 'Only admin and owner can create categories',
        success: false,
      });
    }

    const shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
    if (!shopId) {
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

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
      shopId,
      name: String(name).trim(),
      description: String(description).trim(),
      colorCode: String(colorCode).trim().toUpperCase(),
      createdBy: req.user.id,
      createdByName: String(user.name).trim(),
    });

    const populated = await Category.findById(category._id).populate('createdBy', 'name email role');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A category with this name already exists for this shop',
        success: false,
      });
    }
    res.status(500).json({ message: error.message, success: false });
  }
};

const getCategories = async (req, res) => {
  try {
    const shopId = req.user?.shopId ? String(req.user.shopId).trim().toUpperCase() : '';
    if (!shopId) {
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

    const categories = await Category.find({ shopId })
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: categories.length, data: categories });
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

    const shopId = getRequestShopId(req);
    if (!shopId) {
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

    const category = await Category.findOne({ _id: id, shopId }).populate(
      'createdBy',
      'name email role',
    );
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

    const managerContext = await getCategoryManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;
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

    const category = await Category.findOneAndUpdate({ _id: id, shopId }, updates, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('createdBy', 'name email role');

    if (!category) {
      return res.status(404).json({ message: 'Category not found', success: false });
    }

    return res.json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A category with this name already exists for this shop',
        success: false,
      });
    }
    return res.status(500).json({ message: error.message, success: false });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const managerContext = await getCategoryManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;
    const category = await Category.findOneAndDelete({ _id: id, shopId });
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
