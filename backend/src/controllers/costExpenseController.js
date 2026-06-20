const mongoose = require('mongoose');
const CostExpense = require('../models/costExpense');
const CostCategory = require('../models/costCategory');
const User = require('../models/user');
const {
  publicImagePath,
  unlinkCostExpenseImageIfLocal,
} = require('../middleware/uploadCostExpenseImage');

const COST_EXPENSE_MANAGER_ROLES = ['owner', 'admin', 'staff'];

/** One letter per calendar month (e.g. J100001 = June expense #100001). */
const MONTH_EXPENSE_LETTER = ['A', 'F', 'M', 'P', 'Y', 'J', 'L', 'G', 'S', 'O', 'N', 'D'];

function invalidIdResponse(res) {
  return res.status(400).json({ message: 'Invalid cost expense id', success: false });
}

function parseBooleanInput(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parsePurchaseDate(value) {
  if (value === undefined || value === null || value === '') {
    return new Date();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function parseAmount(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const amount = Number(value);
  if (Number.isNaN(amount) || amount < 0) {
    return null;
  }
  return amount;
}

function parseQty(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const qty = Number(value);
  if (Number.isNaN(qty) || qty < 0) {
    return null;
  }
  return qty;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getCurrentMonthRange(referenceDate = new Date()) {
  const monthStart = startOfDay(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
  );
  const monthEnd = endOfDay(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0),
  );
  return { monthStart, monthEnd };
}

const SUMMARY_PERIOD_KEYS = new Set([
  'current_month',
  'last_month',
  'last_3_months',
  'last_6_months',
  'last_1_year',
]);

function resolveSummaryDateRange(query) {
  const startDateRaw = parseFilterDate(query?.startDate);
  if (startDateRaw === undefined) {
    return { error: 'startDate is invalid' };
  }

  const endDateRaw = parseFilterDate(query?.endDate);
  if (endDateRaw === undefined) {
    return { error: 'endDate is invalid' };
  }

  const hasStart = Boolean(startDateRaw);
  const hasEnd = Boolean(endDateRaw);

  if (hasStart !== hasEnd) {
    return { error: 'Both startDate and endDate are required for a custom date range' };
  }

  if (hasStart && hasEnd) {
    const rangeStart = startOfDay(startDateRaw);
    const rangeEnd = endOfDay(endDateRaw);
    if (rangeStart > rangeEnd) {
      return { error: 'startDate cannot be after endDate' };
    }

    return {
      rangeStart,
      rangeEnd,
      filterType: 'custom_range',
      appliedFilters: {
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      },
    };
  }

  const period = String(query?.period ?? 'current_month')
    .trim()
    .toLowerCase();
  if (!SUMMARY_PERIOD_KEYS.has(period)) {
    return {
      error:
        'Invalid period. Use current_month, last_month, last_3_months, last_6_months, or last_1_year',
    };
  }

  const now = new Date();
  let rangeStart;
  let rangeEnd;

  switch (period) {
    case 'last_month': {
      const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      rangeStart = startOfDay(new Date(ref.getFullYear(), ref.getMonth(), 1));
      rangeEnd = endOfDay(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
      break;
    }
    case 'last_3_months':
      rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 2, 1));
      rangeEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
    case 'last_6_months':
      rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 5, 1));
      rangeEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
    case 'last_1_year':
      rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 11, 1));
      rangeEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
    case 'current_month':
    default: {
      const currentMonth = getCurrentMonthRange(now);
      rangeStart = currentMonth.monthStart;
      rangeEnd = currentMonth.monthEnd;
      break;
    }
  }

  return {
    rangeStart,
    rangeEnd,
    filterType: 'period',
    period,
    appliedFilters: { period },
  };
}

function aggregateCostRecordsByCategory(records) {
  const categoryMap = new Map();
  let totalAmount = 0;

  for (const record of records) {
    const categoryId = String(record.categoryId?._id ?? record.categoryId ?? '');
    const categoryName =
      record.categoryId?.name != null
        ? String(record.categoryId.name).trim()
        : String(record.categoryName || 'Uncategorized').trim();
    const colorCode =
      record.categoryId?.colorCode != null ? String(record.categoryId.colorCode).trim() : '';

    const amount = Number(record.amount) || 0;
    totalAmount += amount;

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        categoryId,
        categoryName,
        colorCode,
        expenseCount: 0,
        totalAmount: 0,
      });
    }

    const categorySummary = categoryMap.get(categoryId);
    categorySummary.expenseCount += 1;
    categorySummary.totalAmount += amount;
  }

  const categories = Array.from(categoryMap.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount,
  );

  return {
    categoryCount: categories.length,
    recordCount: records.length,
    totalAmount,
    categories,
  };
}

function parseFilterDate(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function parsePagination(query) {
  const pageRaw = parseInt(String(query?.page ?? '1'), 10);
  const limitRaw = parseInt(String(query?.limit ?? '20'), 10);

  const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  const limit = Number.isNaN(limitRaw) ? 20 : Math.min(100, Math.max(1, limitRaw));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

async function buildCostHistoryFilter(req, shopId) {
  const filter = { shopId };
  const appliedFilters = {};

  const startDate = parseFilterDate(req.query?.startDate);
  if (startDate === undefined) {
    return { error: 'startDate is invalid' };
  }

  const endDate = parseFilterDate(req.query?.endDate);
  if (endDate === undefined) {
    return { error: 'endDate is invalid' };
  }

  if (startDate && endDate && startOfDay(startDate) > endOfDay(endDate)) {
    return { error: 'startDate cannot be after endDate' };
  }

  if (startDate || endDate) {
    filter.purchaseDate = {};
    if (startDate) {
      filter.purchaseDate.$gte = startOfDay(startDate);
      appliedFilters.startDate = startOfDay(startDate).toISOString();
    }
    if (endDate) {
      filter.purchaseDate.$lte = endOfDay(endDate);
      appliedFilters.endDate = endOfDay(endDate).toISOString();
    }
  }

  const categoryIdRaw = req.query?.categoryId;
  if (categoryIdRaw !== undefined && categoryIdRaw !== null && String(categoryIdRaw).trim() !== '') {
    const categoryId = String(categoryIdRaw).trim();
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return { error: 'Invalid category id' };
    }

    const categoryResult = await resolveShopCategory(categoryId, shopId);
    if (categoryResult.error) {
      return { error: categoryResult.error };
    }

    filter.categoryId = categoryResult.category._id;
    appliedFilters.categoryId = String(categoryResult.category._id);
    appliedFilters.categoryName = categoryResult.category.name;
  }

  return { filter, appliedFilters };
}

function rollbackUploadedFile(req) {
  if (req.file) {
    unlinkCostExpenseImageIfLocal(publicImagePath(req.file.filename));
  }
}

function resolveExpenseImageForCreate(req) {
  if (req.file) {
    return publicImagePath(req.file.filename);
  }
  if (req.body?.image != null && String(req.body.image).trim() !== '') {
    return String(req.body.image).trim();
  }
  return '';
}

function applyExpenseImageUpdate(req, existing, updates) {
  if (req.file) {
    if (existing.image) {
      unlinkCostExpenseImageIfLocal(existing.image);
    }
    updates.image = publicImagePath(req.file.filename);
    return;
  }

  if (req.body?.image !== undefined) {
    const nextImage = String(req.body.image).trim();
    if (nextImage !== existing.image && existing.image) {
      unlinkCostExpenseImageIfLocal(existing.image);
    }
    updates.image = nextImage;
  }
}

async function getCostExpenseManagerContext(userId) {
  const user = await User.findById(userId).select('role shopId name').lean();
  if (!user) {
    return { error: { status: 401, message: 'Not authorized, user not found' } };
  }
  if (!COST_EXPENSE_MANAGER_ROLES.includes(user.role)) {
    return {
      error: { status: 403, message: 'Only owner, admin, and staff can manage cost expenses' },
    };
  }
  const shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
  if (!shopId) {
    return { error: { status: 400, message: 'Shop id is required' } };
  }
  return { shopId, user };
}

async function resolveShopCategory(categoryId, shopId) {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return { error: 'Invalid category id' };
  }

  const category = await CostCategory.findOne({ _id: categoryId, shopId }).lean();
  if (!category) {
    return { error: 'Cost category not found for this shop' };
  }

  return { category };
}

async function generateExpenseId(shopId, purchaseDate) {
  const monthLetter = MONTH_EXPENSE_LETTER[new Date(purchaseDate).getMonth()];
  const prefix = monthLetter;
  const expensePattern = new RegExp(`^${prefix}\\d{6}$`);

  const latest = await CostExpense.findOne({ shopId, expenseId: expensePattern })
    .sort({ expenseId: -1 })
    .lean();

  let sequence = 1;
  if (latest?.expenseId) {
    sequence = Number.parseInt(latest.expenseId.slice(1), 10) + 1;
  }

  if (sequence > 999999) {
    throw new Error('Expense id sequence limit reached for this month');
  }

  return `${prefix}${String(sequence).padStart(6, '0')}`;
}

function resolveQtyForExpense(isProduct, qty, requireQty = false) {
  if (!isProduct) {
    return { qty: null };
  }

  if (requireQty && (qty === undefined || qty === null)) {
    return { error: 'Quantity is required when expense is marked as a product' };
  }

  if (qty === undefined || qty === null) {
    return { qty: null };
  }

  const parsedQty = parseQty(qty);
  if (parsedQty === null) {
    return { error: 'Quantity must be a valid number greater than or equal to 0' };
  }

  if (requireQty && parsedQty <= 0) {
    return { error: 'Quantity must be greater than 0 for product expenses' };
  }

  return { qty: parsedQty };
}



const createCostExpense = async (req, res) => {
  try {
    const managerContext = await getCostExpenseManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;
    const {
      expenseName,
      categoryId,
      categoryName,
      amount,
      isProduct,
      qty,
      purchaseDate,
    } = req.body;

    if (expenseName === undefined || String(expenseName).trim() === '') {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'Expense name is required', success: false });
    }

    if (categoryId === undefined || String(categoryId).trim() === '') {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'Category id is required', success: false });
    }

    const categoryResult = await resolveShopCategory(categoryId, shopId);
    if (categoryResult.error) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: categoryResult.error, success: false });
    }

    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'Amount must be a valid number', success: false });
    }

    const parsedPurchaseDate = parsePurchaseDate(purchaseDate);
    if (!parsedPurchaseDate) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'Purchase date is invalid', success: false });
    }

    const isProductFlag = parseBooleanInput(isProduct, false);
    const qtyResult = resolveQtyForExpense(isProductFlag, qty, isProductFlag);
    if (qtyResult.error) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: qtyResult.error, success: false });
    }

    const resolvedCategoryName =
      categoryName !== undefined && String(categoryName).trim() !== ''
        ? String(categoryName).trim()
        : categoryResult.category.name;

    if (
      String(resolvedCategoryName).trim().toLowerCase() !==
      String(categoryResult.category.name).trim().toLowerCase()
    ) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'Category name does not match category id', success: false });
    }

    const expenseId = await generateExpenseId(shopId, parsedPurchaseDate);

    const costExpense = await CostExpense.create({
      shopId,
      expenseId,
      expenseName: String(expenseName).trim(),
      categoryId: categoryResult.category._id,
      categoryName: categoryResult.category.name,
      amount: parsedAmount,
      isProduct: isProductFlag,
      qty: qtyResult.qty,
      image: resolveExpenseImageForCreate(req),
      createdBy: req.user.id,
      purchaseDate: parsedPurchaseDate,
    });

    const populated = await CostExpense.findById(costExpense._id)
      .populate('createdBy', 'name email role')
      .populate('categoryId', 'name colorCode');

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    rollbackUploadedFile(req);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'An expense with this id already exists for this shop',
        success: false,
      });
    }
    return res.status(500).json({ message: error.message, success: false });
  }
};

// const getCostExpenses = async (req, res) => {
//   try {
//     const managerContext = await getCostExpenseManagerContext(req.user.id);
//     if (managerContext.error) {
//       return res
//         .status(managerContext.error.status)
//         .json({ message: managerContext.error.message, success: false });
//     }

//     const { shopId } = managerContext;

//     const costExpenses = await CostExpense.find({ shopId })
//       .populate('createdBy', 'name email role')
//       .populate('categoryId', 'name colorCode')
//       .sort({ purchaseDate: -1, createdAt: -1 });

//     return res.json({ success: true, count: costExpenses.length, data: costExpenses });
//   } catch (error) {
//     return res.status(500).json({ message: error.message, success: false });
//   }
// };

const getCostHistory = async (req, res) => {
  try {
    const managerContext = await getCostExpenseManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;
    const historyFilter = await buildCostHistoryFilter(req, shopId);
    if (historyFilter.error) {
      return res.status(400).json({ message: historyFilter.error, success: false });
    }

    const { filter, appliedFilters } = historyFilter;
    const { page, limit, skip } = parsePagination(req.query);

    const [total, costExpenses] = await Promise.all([
      CostExpense.countDocuments(filter),
      CostExpense.find(filter)
        .populate('createdBy', 'name email role')
        .populate('updatedBy', 'name email role')
        .populate('categoryId', 'name colorCode')
        .sort({ purchaseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return res.json({
      success: true,
      count: costExpenses.length,
      total,
      filters: appliedFilters,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: costExpenses,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const getCostExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const managerContext = await getCostExpenseManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;

    const costExpense = await CostExpense.findOne({ _id: id, shopId })
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .populate('categoryId', 'name colorCode');

    if (!costExpense) {
      return res.status(404).json({ message: 'Cost expense not found', success: false });
    }

    return res.json({ success: true, data: costExpense });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const updateCostExpense = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      rollbackUploadedFile(req);
      return invalidIdResponse(res);
    }

    const managerContext = await getCostExpenseManagerContext(req.user.id);
    if (managerContext.error) {
      rollbackUploadedFile(req);
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;
    const existing = await CostExpense.findOne({ _id: id, shopId });
    if (!existing) {
      rollbackUploadedFile(req);
      return res.status(404).json({ message: 'Cost expense not found', success: false });
    }

    const updates = {};
    const {
      expenseName,
      categoryId,
      categoryName,
      amount,
      isProduct,
      qty,
      purchaseDate,
    } = req.body;

    if (expenseName !== undefined) {
      const nameTrimmed = String(expenseName).trim();
      if (nameTrimmed === '') {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: 'Expense name cannot be empty', success: false });
      }
      updates.expenseName = nameTrimmed;
    }

    if (categoryId !== undefined || categoryName !== undefined) {
      const nextCategoryId = categoryId !== undefined ? categoryId : existing.categoryId;
      const categoryResult = await resolveShopCategory(nextCategoryId, shopId);
      if (categoryResult.error) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: categoryResult.error, success: false });
      }

      if (categoryName !== undefined && String(categoryName).trim() !== '') {
        if (
          String(categoryName).trim().toLowerCase() !==
          String(categoryResult.category.name).trim().toLowerCase()
        ) {
          rollbackUploadedFile(req);
          return res
            .status(400)
            .json({ message: 'Category name does not match category id', success: false });
        }
      }

      updates.categoryId = categoryResult.category._id;
      updates.categoryName = categoryResult.category.name;
    }

    if (amount !== undefined) {
      const parsedAmount = parseAmount(amount);
      if (parsedAmount === null) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: 'Amount must be a valid number', success: false });
      }
      updates.amount = parsedAmount;
    }

    if (purchaseDate !== undefined) {
      const parsedPurchaseDate = parsePurchaseDate(purchaseDate);
      if (!parsedPurchaseDate) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: 'Purchase date is invalid', success: false });
      }
      updates.purchaseDate = parsedPurchaseDate;
    }

    const nextIsProduct =
      isProduct !== undefined ? parseBooleanInput(isProduct, existing.isProduct) : existing.isProduct;

    if (isProduct !== undefined || qty !== undefined) {
      const qtyResult = resolveQtyForExpense(
        nextIsProduct,
        qty !== undefined ? qty : existing.qty,
        nextIsProduct,
      );
      if (qtyResult.error) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: qtyResult.error, success: false });
      }
      updates.isProduct = nextIsProduct;
      updates.qty = qtyResult.qty;
    }

    applyExpenseImageUpdate(req, existing, updates);

    if (Object.keys(updates).length === 0) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'No fields to update', success: false });
    }

    updates.updatedBy = req.user.id;

    const costExpense = await CostExpense.findOneAndUpdate({ _id: id, shopId }, updates, {
      returnDocument: 'after',
      runValidators: true,
    })
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .populate('categoryId', 'name colorCode');

    return res.json({ success: true, data: costExpense });
  } catch (error) {
    rollbackUploadedFile(req);
    return res.status(500).json({ message: error.message, success: false });
  }
};

const deleteCostExpense = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const managerContext = await getCostExpenseManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;
    const costExpense = await CostExpense.findOneAndDelete({ _id: id, shopId });
    if (!costExpense) {
      return res.status(404).json({ message: 'Cost expense not found', success: false });
    }

    if (costExpense.image) {
      unlinkCostExpenseImageIfLocal(costExpense.image);
    }

    return res.json({
      success: true,
      message: 'Cost expense removed',
      id: costExpense._id,
      expenseId: costExpense.expenseId,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const costOverview = async (req, res) => {
  try {
    const managerContext = await getCostExpenseManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const { shopId } = managerContext;
    const { monthStart, monthEnd } = getCurrentMonthRange();

    const records = await CostExpense.find({
      shopId,
      purchaseDate: { $gte: monthStart, $lte: monthEnd },
    })
      .select('categoryId categoryName amount')
      .populate('categoryId', 'name colorCode')
      .lean();

    const summary = aggregateCostRecordsByCategory(records);

    return res.json({
      success: true,
      data: {
        shopId,
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        ...summary,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const costSummary = async (req, res) => {
  try {
    const managerContext = await getCostExpenseManagerContext(req.user.id);
    if (managerContext.error) {
      return res
        .status(managerContext.error.status)
        .json({ message: managerContext.error.message, success: false });
    }

    const dateRange = resolveSummaryDateRange(req.query);
    if (dateRange.error) {
      return res.status(400).json({ message: dateRange.error, success: false });
    }

    const { shopId } = managerContext;
    const { rangeStart, rangeEnd, filterType, period, appliedFilters } = dateRange;

    const records = await CostExpense.find({
      shopId,
      purchaseDate: { $gte: rangeStart, $lte: rangeEnd },
    })
      .select('categoryId categoryName amount purchaseDate')
      .populate('categoryId', 'name colorCode')
      .lean();

    const summary = aggregateCostRecordsByCategory(records);

    return res.json({
      success: true,
      data: {
        shopId,
        filterType,
        period: period ?? null,
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
        filters: appliedFilters,
        ...summary,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

module.exports = {
  createCostExpense,
  // getCostExpenses,
  getCostHistory,
  getCostExpenseById,
  updateCostExpense,
  deleteCostExpense,
  costOverview,
  costSummary,
};
