const mongoose = require('mongoose');
const CostCategory = require('../models/costCategory');
const CostExpense = require('../models/costExpense');
const User = require('../models/user');

const COST_CATEGORY_MANAGER_ROLES = ['owner', 'admin', 'staff'];

function invalidIdResponse(res) {
  return res.status(400).json({ message: 'Invalid cost category id', success: false });
}

function isValidHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(value).trim());
}

async function getCostCategoryManagerContext(userId) {
  const user = await User.findById(userId).select('role shopId name').lean();
  if (!user) {
    return { error: { status: 401, message: 'Not authorized, user not found' } };
  }
  if (!COST_CATEGORY_MANAGER_ROLES.includes(user.role)) {
    return {
      error: { status: 403, message: 'Only owner, admin, and staff can manage cost categories' },
    };
  }
  const shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
  if (!shopId) {
    return { error: { status: 400, message: 'Shop id is required' } };
  }
  return { shopId, user };
}

const createCostCategory = async (req, res) => {
  try {
    const managerContext = await getCostCategoryManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId, user } = managerContext;
    const { name, colorCode } = req.body;

    if (name === undefined || String(name).trim() === '') {
      return res.status(400).json({ message: 'Name is required', success: false });
    }
    if (colorCode === undefined || String(colorCode).trim() === '') {
      return res.status(400).json({ message: 'Color code is required', success: false });
    }
    if (!isValidHexColor(colorCode)) {
      return res
        .status(400)
        .json({ message: 'Color code must be a valid hex value like #3B82F6', success: false });
    }

    const costCategory = await CostCategory.create({
      shopId,
      name: String(name).trim(),
      colorCode: String(colorCode).trim().toUpperCase(),
      createdBy: req.user.id,
      createdByName: String(user.name).trim(),
    });

    const populated = await CostCategory.findById(costCategory._id).populate(
      'createdBy',
      'name email role',
    );

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A cost category with this name already exists for this shop',
        success: false,
      });
    }
    res.status(500).json({ message: error.message, success: false });
  }
};

const getCostCategories = async (req, res) => {
  try {
    const managerContext = await getCostCategoryManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;

    const costCategories = await CostCategory.find({ shopId })
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: costCategories.length, data: costCategories });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};

const getCostCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const managerContext = await getCostCategoryManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;

    const costCategory = await CostCategory.findOne({ _id: id, shopId }).populate(
      'createdBy',
      'name email role',
    );
    if (!costCategory) {
      return res.status(404).json({ message: 'Cost category not found', success: false });
    }

    return res.json({ success: true, data: costCategory });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const updateCostCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const managerContext = await getCostCategoryManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;
    const { name, colorCode } = req.body;
    const updates = {};

    if (name !== undefined) {
      const nameTrimmed = String(name).trim();
      if (nameTrimmed === '') {
        return res.status(400).json({ message: 'Name cannot be empty', success: false });
      }
      updates.name = nameTrimmed;
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

    const costCategory = await CostCategory.findOneAndUpdate({ _id: id, shopId }, updates, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('createdBy', 'name email role');

    if (!costCategory) {
      return res.status(404).json({ message: 'Cost category not found', success: false });
    }

    return res.json({ success: true, data: costCategory });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A cost category with this name already exists for this shop',
        success: false,
      });
    }
    return res.status(500).json({ message: error.message, success: false });
  }
};

const deleteCostCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const managerContext = await getCostCategoryManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;

    const linkedExpense = await CostExpense.exists({ shopId, categoryId: id });
    if (linkedExpense) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete this category. There are already expense records for that category.',
        code: 'CATEGORY_HAS_EXPENSES',
      });
    }

    const costCategory = await CostCategory.findOneAndDelete({ _id: id, shopId });
    if (!costCategory) {
      return res.status(404).json({ message: 'Cost category not found', success: false });
    }

    return res.json({ success: true, message: 'Cost category removed', id: costCategory._id });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

module.exports = {
  createCostCategory,
  getCostCategories,
  getCostCategoryById,
  updateCostCategory,
  deleteCostCategory,
};
