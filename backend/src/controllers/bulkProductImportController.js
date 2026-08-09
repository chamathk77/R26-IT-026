const mongoose = require('mongoose');
const Product = require('../models/product');
const Category = require('../models/category');
const Branch = require('../models/branch');
const BranchStock = require('../models/branchStock');
const Cart = require('../models/cart');
const User = require('../models/user');
const BulkProductImportResult = require('../models/bulkProductImportResult');

const EXPECTED_COLUMNS = [
  'productName',
  'categoryName',
  'type',
  'amount',
  'cost',
  'isInventoryAvailable',
  'openingQty',
  'barcode',
];

const CATEGORY_COLOR_OPTIONS = [
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
  '#6366F1',
  '#F97316',
  '#22C55E',
  '#0EA5E9',
  '#A855F7',
  '#E11D48',
  '#84CC16',
  '#06B6D4',
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeCategoryKey(name) {
  return String(name).trim().toLowerCase();
}

function normalizeProductNameKey(name) {
  return String(name).trim().toLowerCase();
}

function getRequestShopId(req) {
  return req.user?.shopId ? String(req.user.shopId).trim().toUpperCase() : '';
}

function getRequestBranchId(req) {
  return req.user?.branchId ? String(req.user.branchId).trim().toUpperCase() : '';
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function parseBooleanInput(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: false, value: null };
  }
  if (typeof value === 'boolean') {
    return { ok: true, value };
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) {
    return { ok: true, value: true };
  }
  if (['false', '0', 'no'].includes(normalized)) {
    return { ok: true, value: false };
  }
  return { ok: false, value: null };
}

function parseOptionalNumber(value) {
  if (isBlank(value)) {
    return { ok: true, value: null };
  }
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) {
    return { ok: false, value: null };
  }
  return { ok: true, value: num };
}

function parseRequiredNumber(value) {
  if (isBlank(value)) {
    return { ok: false, value: null };
  }
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) {
    return { ok: false, value: null };
  }
  return { ok: true, value: num };
}

function validateColumns(columns) {
  if (!Array.isArray(columns)) {
    return {
      valid: false,
      errors: ['columns must be an array of column names'],
      expectedColumns: EXPECTED_COLUMNS,
      receivedColumns: [],
    };
  }

  const receivedColumns = columns.map((col) => String(col).trim());
  const errors = [];

  if (receivedColumns.length !== EXPECTED_COLUMNS.length) {
    errors.push(
      `Expected ${EXPECTED_COLUMNS.length} columns but received ${receivedColumns.length}`,
    );
  }

  EXPECTED_COLUMNS.forEach((expected, index) => {
    const received = receivedColumns[index];
    if (received !== expected) {
      errors.push(
        `Column at position ${index + 1} must be "${expected}" but received "${received ?? ''}"`,
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    expectedColumns: EXPECTED_COLUMNS,
    receivedColumns,
  };
}

function normalizeRow(row, rowNumber) {
  if (row == null || typeof row !== 'object' || Array.isArray(row)) {
    return {
      rowNumber,
      productName: '',
      categoryName: '',
      type: '',
      amount: '',
      cost: '',
      isInventoryAvailable: '',
      openingQty: '',
      barcode: '',
    };
  }

  return {
    rowNumber,
    productName: row.productName ?? '',
    categoryName: row.categoryName ?? '',
    type: row.type ?? '',
    amount: row.amount ?? '',
    cost: row.cost ?? '',
    isInventoryAvailable: row.isInventoryAvailable ?? '',
    openingQty: row.openingQty ?? '',
    barcode: row.barcode ?? '',
  };
}

function validateRow(row, { barcodeTracker, productNameTracker }) {
  const errors = [];
  const normalized = normalizeRow(row, row.rowNumber);

  const productName = String(normalized.productName).trim();
  if (!productName) {
    errors.push('productName is required');
  } else {
    const productNameKey = normalizeProductNameKey(productName);
    if (productNameTracker.has(productNameKey)) {
      errors.push(`productName "${productName}" is duplicated in this upload file`);
    } else {
      productNameTracker.add(productNameKey);
    }
  }

  const categoryName = String(normalized.categoryName).trim();
  if (!categoryName) {
    errors.push('categoryName is required');
  }

  const typeRaw = String(normalized.type).trim().toLowerCase();
  if (isBlank(normalized.type)) {
    errors.push('type is required');
  } else if (!['product', 'service'].includes(typeRaw)) {
    errors.push('type must be either product or service');
  }

  const inventoryParsed = parseBooleanInput(normalized.isInventoryAvailable);
  if (isBlank(normalized.isInventoryAvailable)) {
    errors.push('isInventoryAvailable is required');
  } else if (!inventoryParsed.ok) {
    errors.push('isInventoryAvailable must be a boolean value (true/false, 1/0, yes/no)');
  }

  let amount = null;
  let cost = null;
  let openingQty = null;
  let isInventoryAvailable = inventoryParsed.ok ? inventoryParsed.value : false;
  let barcode = String(normalized.barcode).trim();

  if (typeRaw === 'product') {
    const amountParsed = parseRequiredNumber(normalized.amount);
    if (isBlank(normalized.amount)) {
      errors.push('amount is required when type is product');
    } else if (!amountParsed.ok) {
      errors.push('amount must be a non-negative number when type is product');
    } else {
      amount = amountParsed.value;
    }

    const costParsed = parseOptionalNumber(normalized.cost);
    if (!isBlank(normalized.cost) && !costParsed.ok) {
      errors.push('cost must be a non-negative number when provided');
    } else {
      cost = costParsed.value;
    }

    if (inventoryParsed.ok && isInventoryAvailable) {
      const openingQtyParsed = parseRequiredNumber(normalized.openingQty);
      if (isBlank(normalized.openingQty)) {
        errors.push('openingQty is required when isInventoryAvailable is true');
      } else if (!openingQtyParsed.ok) {
        errors.push('openingQty must be a non-negative number when isInventoryAvailable is true');
      } else {
        openingQty = openingQtyParsed.value;
      }
    } else if (!isBlank(normalized.openingQty)) {
      const openingQtyParsed = parseOptionalNumber(normalized.openingQty);
      if (!openingQtyParsed.ok) {
        errors.push('openingQty must be a non-negative number when provided');
      }
    }

    if (!isBlank(normalized.barcode)) {
      const barcodeKey = barcode.toLowerCase();
      if (barcodeTracker.has(barcodeKey)) {
        errors.push(`barcode "${barcode}" is duplicated in this upload file`);
      } else {
        barcodeTracker.add(barcodeKey);
      }
    } else {
      barcode = null;
    }
  } else if (typeRaw === 'service') {
    if (inventoryParsed.ok && isInventoryAvailable) {
      errors.push('isInventoryAvailable must be false when type is service');
    }
    isInventoryAvailable = false;

    if (!isBlank(normalized.amount)) {
      const amountParsed = parseOptionalNumber(normalized.amount);
      if (!amountParsed.ok) {
        errors.push('amount must be a non-negative number when provided for service type');
      }
    }

    if (!isBlank(normalized.cost)) {
      errors.push('cost is not allowed when type is service');
    }

    if (!isBlank(normalized.openingQty)) {
      errors.push('openingQty is not allowed when type is service');
    }

    if (!isBlank(normalized.barcode)) {
      errors.push('barcode is not allowed when type is service');
    }
    barcode = '';
  }

  return {
    valid: errors.length === 0,
    errors,
    values: normalized,
    parsed: {
      productName,
      categoryName,
      type: typeRaw,
      amount,
      cost,
      isInventoryAvailable,
      openingQty,
      barcode,
    },
  };
}

function pickCategoryColor(usedColors) {
  const used = new Set(
    [...usedColors].map((color) => String(color).trim().toUpperCase()),
  );
  const available = CATEGORY_COLOR_OPTIONS.filter(
    (color) => !used.has(color.toUpperCase()),
  );
  const palette = available.length ? available : CATEGORY_COLOR_OPTIONS;
  const index = Math.floor(Math.random() * palette.length);
  return palette[index].toUpperCase();
}

async function findCategoryByName(shopId, categoryName) {
  const trimmed = String(categoryName).trim();
  return Category.findOne({
    shopId,
    name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
  }).lean();
}

async function loadExistingProductNameKeys(shopId) {
  const products = await Product.find({ shopId }).select('productName').lean();
  return new Set(products.map((product) => normalizeProductNameKey(product.productName)));
}

async function createBranchStockForProduct({ shopId, productId, currentBranchId, qty }) {
  const branches = await Branch.find({ shopId }).select('branchId').lean();
  if (!branches.length) {
    return { error: 'No branches found for this shop' };
  }

  const current = String(currentBranchId).trim().toUpperCase();
  const hasCurrent = branches.some(
    (branch) => String(branch.branchId).trim().toUpperCase() === current,
  );
  if (!hasCurrent) {
    return { error: 'Logged-in branch not found for this shop' };
  }

  const docs = branches.map((branch) => {
    const branchId = String(branch.branchId).trim().toUpperCase();
    return {
      shopId,
      branchId,
      productId,
      qty: branchId === current ? qty : 0,
    };
  });

  await BranchStock.insertMany(docs);
  return { error: null };
}

async function resolveCategory({
  shopId,
  categoryName,
  userId,
  createdByName,
  categoryCache,
  usedCategoryColors,
  categoriesCreated,
}) {
  const cacheKey = normalizeCategoryKey(categoryName);
  if (categoryCache.has(cacheKey)) {
    return { category: categoryCache.get(cacheKey), created: false, error: null };
  }

  const existing = await findCategoryByName(shopId, categoryName);
  if (existing) {
    categoryCache.set(cacheKey, existing);
    return { category: existing, created: false, error: null };
  }

  try {
    const colorCode = pickCategoryColor(usedCategoryColors);
    usedCategoryColors.add(colorCode);

    const category = await Category.create({
      shopId,
      name: String(categoryName).trim(),
      description: '',
      colorCode,
      createdBy: userId,
      createdByName,
    });

    const categoryObj = category.toObject();
    categoryCache.set(cacheKey, categoryObj);
    categoriesCreated.push({
      id: categoryObj._id,
      name: categoryObj.name,
      colorCode: categoryObj.colorCode,
    });

    return { category: categoryObj, created: true, error: null };
  } catch (error) {
    if (error.code === 11000) {
      const raced = await findCategoryByName(shopId, categoryName);
      if (raced) {
        categoryCache.set(cacheKey, raced);
        return { category: raced, created: false, error: null };
      }
    }
    return { category: null, created: false, error: error.message || 'Failed to create category' };
  }
}

async function importValidatedRow({
  rowNumber,
  parsed,
  shopId,
  branchId,
  userId,
  createdByName,
  categoryCache,
  usedCategoryColors,
  categoriesCreated,
  existingProductNameKeys,
}) {
  const productNameKey = normalizeProductNameKey(parsed.productName);
  if (existingProductNameKeys.has(productNameKey)) {
    return {
      imported: false,
      failedRow: {
        rowNumber,
        productName: parsed.productName,
        categoryName: parsed.categoryName,
        type: parsed.type,
        amount: parsed.amount,
        cost: parsed.cost,
        isInventoryAvailable: parsed.isInventoryAvailable,
        openingQty: parsed.openingQty,
        barcode: parsed.barcode,
        errors: ['A product with this name already exists for this shop'],
      },
    };
  }

  const categoryResult = await resolveCategory({
    shopId,
    categoryName: parsed.categoryName,
    userId,
    createdByName,
    categoryCache,
    usedCategoryColors,
    categoriesCreated,
  });

  if (categoryResult.error) {
    return {
      imported: false,
      failedRow: {
        rowNumber,
        ...parsed,
        errors: [categoryResult.error],
      },
    };
  }

  const category = categoryResult.category;
  const productFields = {
    shopId,
    productName: parsed.productName,
    categoryId: category._id,
    categoryName: category.name,
    type: parsed.type,
    image: '',
    createdBy: userId,
  };

  if (parsed.type === 'service') {
    Object.assign(productFields, {
      amount: null,
      cost: null,
      isInventoryAvailable: false,
      barcode: null,
    });
  } else {
    productFields.amount = parsed.amount;
    productFields.cost = parsed.cost;
    productFields.isInventoryAvailable = parsed.isInventoryAvailable;
    productFields.barcode = parsed.barcode || null;

    if (parsed.barcode) {
      const conflict = await Product.findOne({
        shopId,
        barcode: parsed.barcode,
      })
        .select('_id')
        .lean();

      if (conflict) {
        return {
          imported: false,
          failedRow: {
            rowNumber,
            productName: parsed.productName,
            categoryName: parsed.categoryName,
            type: parsed.type,
            amount: parsed.amount,
            cost: parsed.cost,
            isInventoryAvailable: parsed.isInventoryAvailable,
            openingQty: parsed.openingQty,
            barcode: parsed.barcode,
            errors: ['A product with this barcode already exists for this shop'],
          },
        };
      }
    }
  }

  let product;
  try {
    product = await Product.create(productFields);
  } catch (error) {
    const message =
      error.code === 11000
        ? 'A product with this barcode already exists for this shop'
        : error.message || 'Failed to create product';

    return {
      imported: false,
      failedRow: {
        rowNumber,
        productName: parsed.productName,
        categoryName: parsed.categoryName,
        type: parsed.type,
        amount: parsed.amount,
        cost: parsed.cost,
        isInventoryAvailable: parsed.isInventoryAvailable,
        openingQty: parsed.openingQty,
        barcode: parsed.barcode,
        errors: [message],
      },
    };
  }

  if (productFields.isInventoryAvailable) {
    const stockResult = await createBranchStockForProduct({
      shopId,
      productId: product._id,
      currentBranchId: branchId,
      qty: parsed.openingQty,
    });

    if (stockResult.error) {
      await Product.deleteOne({ _id: product._id, shopId });
      return {
        imported: false,
        failedRow: {
          rowNumber,
          productName: parsed.productName,
          categoryName: parsed.categoryName,
          type: parsed.type,
          amount: parsed.amount,
          cost: parsed.cost,
          isInventoryAvailable: parsed.isInventoryAvailable,
          openingQty: parsed.openingQty,
          barcode: parsed.barcode,
          errors: [stockResult.error],
        },
      };
    }
  }

  existingProductNameKeys.add(productNameKey);

  return {
    imported: true,
    failedRow: null,
    category: {
      id: category._id,
      name: category.name,
      created: categoryResult.created,
    },
    product: {
      id: product._id,
      productName: product.productName,
      categoryId: category._id,
      categoryName: category.name,
    },
  };
}

const bulkImportProducts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name shopId branchId').lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found',
      });
    }

    const shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    const { columns, rows } = req.body;
    const columnValidation = validateColumns(columns);
    if (!columnValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid column headers or order',
        errors: columnValidation.errors,
        expectedColumns: columnValidation.expectedColumns,
        receivedColumns: columnValidation.receivedColumns,
      });
    }

    if (!Array.isArray(rows)) {
      return res.status(400).json({
        success: false,
        message: 'rows must be an array',
        errors: ['rows must be an array of product records'],
      });
    }

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'No records found to import',
        errors: ['rows must contain at least one record'],
      });
    }

    const branchId = getRequestBranchId(req);
    const barcodeTracker = new Set();
    const productNameTracker = new Set();
    const failedRows = [];
    const validRows = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 1;
      const normalized = normalizeRow(row, rowNumber);
      const validation = validateRow(normalized, { barcodeTracker, productNameTracker });

      if (!validation.valid) {
        failedRows.push({
          rowNumber,
          productName: normalized.productName,
          categoryName: normalized.categoryName,
          type: normalized.type,
          amount: normalized.amount,
          cost: normalized.cost,
          isInventoryAvailable: normalized.isInventoryAvailable,
          openingQty: normalized.openingQty,
          barcode: normalized.barcode,
          errors: validation.errors,
        });
        return;
      }

      if (validation.parsed.type === 'product' && validation.parsed.isInventoryAvailable && !branchId) {
        failedRows.push({
          rowNumber,
          productName: normalized.productName,
          categoryName: normalized.categoryName,
          type: normalized.type,
          amount: normalized.amount,
          cost: normalized.cost,
          isInventoryAvailable: normalized.isInventoryAvailable,
          openingQty: normalized.openingQty,
          barcode: normalized.barcode,
          errors: ['Branch id is required to create inventory stock'],
        });
        return;
      }

      validRows.push({
        rowNumber,
        parsed: validation.parsed,
      });
    });

    const existingCategories = await Category.find({ shopId }).select('colorCode').lean();
    const usedCategoryColors = new Set(
      existingCategories
        .map((category) => category.colorCode)
        .filter(Boolean)
        .map((color) => String(color).trim().toUpperCase()),
    );
    const existingProductNameKeys = await loadExistingProductNameKeys(shopId);

    const categoryCache = new Map();
    const categoriesCreated = [];
    let importedCount = 0;

    for (const row of validRows) {
      const result = await importValidatedRow({
        rowNumber: row.rowNumber,
        parsed: row.parsed,
        shopId,
        branchId,
        userId: req.user.id,
        createdByName: String(user.name || '').trim() || 'Unknown',
        categoryCache,
        usedCategoryColors,
        categoriesCreated,
        existingProductNameKeys,
      });

      if (result.imported) {
        importedCount += 1;
      } else if (result.failedRow) {
        failedRows.push(result.failedRow);
      }
    }

    failedRows.sort((a, b) => a.rowNumber - b.rowNumber);

    const responsePayload = {
      success: true,
      summary: {
        totalRows: rows.length,
        imported: importedCount,
        failed: failedRows.length,
        categoriesCreated: categoriesCreated.length,
      },
      categoriesCreated,
      failedRows,
    };

    const importedByName = String(user.name || '').trim() || 'Unknown';

    await BulkProductImportResult.deleteMany({ shopId });
    await BulkProductImportResult.create({
      shopId,
      importedBy: req.user.id,
      importedByName,
      summary: responsePayload.summary,
      categoriesCreated: categoriesCreated.map((category) => ({
        id: category.id,
        name: category.name,
        colorCode: category.colorCode,
      })),
      failedRows: failedRows.map((row) => ({
        rowNumber: row.rowNumber,
        productName: row.productName ?? '',
        categoryName: row.categoryName ?? '',
        type: row.type ?? '',
        amount: row.amount ?? '',
        cost: row.cost ?? '',
        isInventoryAvailable: row.isInventoryAvailable ?? '',
        openingQty: row.openingQty ?? '',
        barcode: row.barcode ?? '',
        errors: Array.isArray(row.errors) ? row.errors : [],
      })),
    });

    return res.status(200).json(responsePayload);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Bulk import failed',
    });
  }
};

function mapBulkImportResultRecord(record) {
  if (!record) {
    return null;
  }

  const doc = record.toObject ? record.toObject() : record;

  return {
    success: true,
    summary: doc.summary,
    categoriesCreated: (doc.categoriesCreated ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      colorCode: category.colorCode,
    })),
    failedRows: (doc.failedRows ?? []).map((row) => ({
      rowNumber: row.rowNumber,
      productName: row.productName,
      categoryName: row.categoryName,
      type: row.type,
      amount: row.amount,
      cost: row.cost,
      isInventoryAvailable: row.isInventoryAvailable,
      openingQty: row.openingQty,
      barcode: row.barcode,
      errors: row.errors ?? [],
    })),
    importedBy: doc.importedBy,
    importedByName: doc.importedByName,
    importedAt: doc.updatedAt ?? doc.createdAt ?? null,
  };
}

const BULK_CATALOG_MANAGER_ROLES = ['admin', 'owner'];

async function getBulkCatalogManagerContext(userId) {
  const user = await User.findById(userId).select('role shopId').lean();
  if (!user) {
    return { error: { status: 401, message: 'Not authorized, user not found' } };
  }
  if (!BULK_CATALOG_MANAGER_ROLES.includes(user.role)) {
    return { error: { status: 403, message: 'Only admin and owner can delete catalog data' } };
  }
  const shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
  if (!shopId) {
    return { error: { status: 400, message: 'Shop id is required' } };
  }
  return { shopId };
}

const getBulkProductImportResult = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('shopId').lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found',
      });
    }

    const shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    const record = await BulkProductImportResult.findOne({ shopId })
      .sort({ updatedAt: -1 })
      .lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No bulk import result found for this shop',
      });
    }

    return res.status(200).json(mapBulkImportResultRecord(record));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch bulk import result',
    });
  }
};

const deleteAllShopCatalogData = async (req, res) => {
  try {
    const context = await getBulkCatalogManagerContext(req.user.id);
    if (context.error) {
      return res.status(context.error.status).json({
        success: false,
        message: context.error.message,
      });
    }

    const { shopId } = context;

    const branchStockResult = await BranchStock.deleteMany({ shopId });
    const productResult = await Product.deleteMany({ shopId });
    const categoryResult = await Category.deleteMany({ shopId });
    const cartResult = await Cart.deleteMany({ shopId });
    await BulkProductImportResult.deleteMany({ shopId });

    return res.status(200).json({
      success: true,
      deleted: {
        branchStock: branchStockResult.deletedCount ?? 0,
        products: productResult.deletedCount ?? 0,
        categories: categoryResult.deletedCount ?? 0,
        carts: cartResult.deletedCount ?? 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete catalog data',
    });
  }
};

const dismissBulkProductImportResult = async (req, res) => {
  try {
    const context = await getBulkCatalogManagerContext(req.user.id);
    if (context.error) {
      return res.status(context.error.status).json({
        success: false,
        message: context.error.message,
      });
    }

    const { shopId } = context;
    const result = await BulkProductImportResult.deleteMany({ shopId });

    return res.status(200).json({
      success: true,
      dismissed: result.deletedCount ?? 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to dismiss bulk import result',
    });
  }
};

module.exports = {
  bulkImportProducts,
  getBulkProductImportResult,
  deleteAllShopCatalogData,
  dismissBulkProductImportResult,
  EXPECTED_COLUMNS,
};
