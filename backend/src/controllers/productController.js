const mongoose = require('mongoose');
const Product = require('../models/product');
const Category = require('../models/category');
const Branch = require('../models/branch');
const BranchStock = require('../models/branchStock');
const User = require('../models/user');
const ShopsData = require('../models/shopsData');
const { publicImagePath, unlinkProductImageIfLocal } = require('../middleware/uploadProductImage');

function rollbackUploadedFile(req) {
  if (req.file) {
    unlinkProductImageIfLocal(publicImagePath(req.file.filename));
  }
}

function resolveProductImageForCreate(req) {
  if (req.file) {
    return publicImagePath(req.file.filename);
  }
  if (req.body?.image != null && String(req.body.image).trim() !== '') {
    return String(req.body.image).trim();
  }
  return '';
}

function applyProductImageUpdate(req, existing, updates) {
  if (req.file) {
    if (existing.image) {
      unlinkProductImageIfLocal(existing.image);
    }
    updates.image = publicImagePath(req.file.filename);
    return;
  }

  if (req.body?.image !== undefined) {
    const nextImage = String(req.body.image).trim();
    if (nextImage !== existing.image && existing.image) {
      unlinkProductImageIfLocal(existing.image);
    }
    updates.image = nextImage;
  }
}

function invalidIdResponse(res) {
  return res.status(400).json({ message: 'Invalid product id', success: false });
}



function getRequestShopId(req) {
  return req.user?.shopId ? String(req.user.shopId).trim().toUpperCase() : '';
}

function getRequestBranchId(req) {
  return req.user?.branchId ? String(req.user.branchId).trim().toUpperCase() : '';
}

function applyServiceTypeFields(updates) {
  updates.type = 'service';
  updates.isInventoryAvailable = false;
  updates.amount = null;
  updates.barcode = null;
  updates.cost = null;
  updates.warrantyAvailable = false;
  updates.warrantyMonths = null;
}

function parseStrictBooleanInput(value) {
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

function parseWarrantyMonthsInput(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: false, value: null };
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1 || !Number.isInteger(num)) {
    return { ok: false, value: null };
  }
  return { ok: true, value: num };
}

function applyWarrantyFields(productFields, body, { warrantyModuleEnabled, productType, existing }) {
  if (!warrantyModuleEnabled || productType === 'service') {
    productFields.warrantyAvailable = false;
    productFields.warrantyMonths = null;
    return null;
  }

  const warrantyAvailableProvided =
    body.warrantyAvailable !== undefined && body.warrantyAvailable !== '';
  const warrantyMonthsProvided =
    body.warrantyMonths !== undefined && body.warrantyMonths !== '';

  if (!warrantyAvailableProvided && !warrantyMonthsProvided) {
    if (existing) {
      return null;
    }
    productFields.warrantyAvailable = false;
    productFields.warrantyMonths = null;
    return null;
  }

  let warrantyAvailable = existing ? Boolean(existing.warrantyAvailable) : false;

  if (warrantyAvailableProvided) {
    const parsed = parseStrictBooleanInput(body.warrantyAvailable);
    if (!parsed.ok) {
      return 'warrantyAvailable must be true or false';
    }
    warrantyAvailable = parsed.value;
  }

  if (warrantyAvailable) {
    if (warrantyMonthsProvided) {
      const monthsParsed = parseWarrantyMonthsInput(body.warrantyMonths);
      if (!monthsParsed.ok) {
        return 'warrantyMonths must be a whole number greater than 0';
      }
      productFields.warrantyAvailable = true;
      productFields.warrantyMonths = monthsParsed.value;
      return null;
    }

    const existingMonths = existing?.warrantyMonths ?? productFields.warrantyMonths ?? null;
    if (existingMonths == null) {
      return 'warrantyMonths is required when warrantyAvailable is true';
    }
    productFields.warrantyAvailable = true;
    productFields.warrantyMonths = existingMonths;
    return null;
  }

  if (warrantyMonthsProvided) {
    return 'warrantyMonths is not allowed when warrantyAvailable is false';
  }

  productFields.warrantyAvailable = false;
  productFields.warrantyMonths = null;
  return null;
}

/**
 * Creates BranchStock for every shop branch (active + inactive).
 * Logged-in branch gets openingQty; all other branches get 0.
 */
async function createBranchStockForProduct({ shopId, productId, currentBranchId, qty }) {
  const branches = await Branch.find({ shopId }).select('branchId').lean();
  if (!branches.length) {
    return { error: 'No branches found for this shop' };
  }

  const current = String(currentBranchId).trim().toUpperCase();
  const hasCurrent = branches.some(
    (b) => String(b.branchId).trim().toUpperCase() === current,
  );
  if (!hasCurrent) {
    return { error: 'Logged-in branch not found for this shop' };
  }

  const docs = branches.map((b) => {
    const branchId = String(b.branchId).trim().toUpperCase();
    return {
      shopId,
      branchId,
      productId,
      qty: branchId === current ? qty : 0,
    };
  });

  await BranchStock.insertMany(docs);
  return { error: null, currentQty: qty };
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

function normalizeBarcode(barcode) {
  if (barcode === undefined || barcode === null) return null;
  const barcodeTrimmed = String(barcode).trim();
  return barcodeTrimmed || null;
}

function normalizeProductNumber(productNumber) {
  if (productNumber === undefined || productNumber === null) return null;
  const trimmed = String(productNumber).trim();
  return trimmed || null;
}

async function assignBarcodeToProductFields(productFields, shopId, barcode, excludeProductId = null) {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) {
    productFields.barcode = null;
    return null;
  }

  const filter = { shopId, barcode: normalized };
  if (excludeProductId) {
    filter._id = { $ne: excludeProductId };
  }

  const conflict = await Product.findOne(filter).select('_id').lean();
  if (conflict) {
    return 'A product with this barcode already exists for this shop';
  }

  productFields.barcode = normalized;
  return null;
}

async function assignProductNumberToProductFields(
  productFields,
  shopId,
  productNumber,
  excludeProductId = null,
) {
  const normalized = normalizeProductNumber(productNumber);
  if (!normalized) {
    productFields.productNumber = null;
    return null;
  }

  const filter = { shopId, productNumber: normalized };
  if (excludeProductId) {
    filter._id = { $ne: excludeProductId };
  }

  const conflict = await Product.findOne(filter).select('_id').lean();
  if (conflict) {
    return 'A product with this product number already exists for this shop';
  }

  productFields.productNumber = normalized;
  return null;
}

function duplicateKeyMessage(error) {
  const keyPattern = error?.keyPattern || {};
  if (keyPattern.barcode) {
    return 'A product with this barcode already exists for this shop';
  }
  if (keyPattern.productNumber) {
    return 'A product with this product number already exists for this shop';
  }
  return 'Duplicate product value for this shop';
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildProductListFilter(shopId, query = {}) {
  const filter = { shopId };
  const and = [];

  const productNumber = normalizeProductNumber(query.productNumber);
  if (productNumber) {
    and.push({
      productNumber: { $regex: escapeRegex(productNumber), $options: 'i' },
    });
  }

  const barcode = normalizeBarcode(query.barcode);
  if (barcode) {
    and.push({
      barcode: { $regex: escapeRegex(barcode), $options: 'i' },
    });
  }

  const name = query.name != null ? String(query.name).trim() : '';
  if (name) {
    and.push({
      $or: [
        { productName: { $regex: escapeRegex(name), $options: 'i' } },
        { categoryName: { $regex: escapeRegex(name), $options: 'i' } },
        { productNumber: { $regex: escapeRegex(name), $options: 'i' } },
      ],
    });
  }

  const search = query.search != null ? String(query.search).trim() : '';
  if (search) {
    const pattern = escapeRegex(search);
    and.push({
      $or: [
        { productName: { $regex: pattern, $options: 'i' } },
        { categoryName: { $regex: pattern, $options: 'i' } },
        { productNumber: { $regex: pattern, $options: 'i' } },
        { barcode: { $regex: pattern, $options: 'i' } },
      ],
    });
  }

  if (and.length === 1) {
    Object.assign(filter, and[0]);
  } else if (and.length > 1) {
    filter.$and = and;
  }

  return filter;
}

function resolveQtyFields({ isInventoryAvailable, qty, requireQty = false }) {
  if (!isInventoryAvailable) {
    return { isInventoryAvailable: false, qty: null };
  }

  if (requireQty && (qty === undefined || qty === null || qty === '' || Number.isNaN(Number(qty)))) {
    return { error: 'Quantity is required when inventory is enabled' };
  }

  let qtyValue = null;
  if (qty !== undefined && qty !== null && qty !== '') {
    qtyValue = Number(qty);
    if (Number.isNaN(qtyValue) || qtyValue < 0) {
      return { error: 'Quantity must be zero or positive' };
    }
  } else if (requireQty) {
    return { error: 'Quantity is required when inventory is enabled' };
  }

  return { isInventoryAvailable: true, qty: qtyValue };
}

function applyInventoryUpdates(updates, existing, body) {
  const inventoryToggled = body.isInventoryAvailable !== undefined;
  const nextInventoryAvailable = inventoryToggled
    ? parseBooleanInput(body.isInventoryAvailable)
    : existing.isInventoryAvailable;

  if (inventoryToggled) {
    updates.isInventoryAvailable = nextInventoryAvailable;
  }

  const effectiveInventory = updates.isInventoryAvailable ?? existing.isInventoryAvailable;
  const qtyInput = body.qty !== undefined ? body.qty : body.productQty;
  const qtyProvided = qtyInput !== undefined;

  if (!effectiveInventory) {
    return {
      error: null,
      inventoryEnabled: false,
      qty: null,
      qtyProvided: false,
    };
  }

  if (inventoryToggled && nextInventoryAvailable) {
    const resolved = resolveQtyFields({
      isInventoryAvailable: true,
      qty: qtyInput,
      requireQty: true,
    });
    if (resolved.error) {
      return { error: resolved.error };
    }
    return {
      error: null,
      inventoryEnabled: true,
      qty: resolved.qty,
      qtyProvided: true,
    };
  }

  if (qtyProvided) {
    const resolved = resolveQtyFields({
      isInventoryAvailable: true,
      qty: qtyInput,
      requireQty: true,
    });
    if (resolved.error) {
      return { error: resolved.error };
    }
    return {
      error: null,
      inventoryEnabled: true,
      qty: resolved.qty,
      qtyProvided: true,
    };
  }

  return {
    error: null,
    inventoryEnabled: true,
    qty: null,
    qtyProvided: false,
  };
}

/**
 * Inventory ON:
 * - Update logged-in branch qty when provided
 * - Create missing branch rows (current needs qty; others get 0)
 * Inventory managed off is handled by deleteBranchStockForProduct.
 */
async function syncBranchStockOnUpdate({
  shopId,
  productId,
  currentBranchId,
  qty,
  qtyProvided,
}) {
  const branches = await Branch.find({ shopId }).select('branchId').lean();
  if (!branches.length) {
    return { error: 'No branches found for this shop' };
  }

  const current = String(currentBranchId).trim().toUpperCase();
  const hasCurrent = branches.some(
    (b) => String(b.branchId).trim().toUpperCase() === current,
  );
  if (!hasCurrent) {
    return { error: 'Logged-in branch not found for this shop' };
  }

  const existingStocks = await BranchStock.find({ shopId, productId })
    .select('branchId qty')
    .lean();
  const byBranch = new Map(
    existingStocks.map((s) => [String(s.branchId).trim().toUpperCase(), s]),
  );

  const currentExisting = byBranch.get(current);
  if (!currentExisting && !qtyProvided) {
    return { error: 'Quantity is required when inventory is enabled' };
  }

  const toCreate = [];
  let currentQty = qtyProvided ? qty : Number(currentExisting?.qty) || 0;

  for (const branch of branches) {
    const branchId = String(branch.branchId).trim().toUpperCase();
    const existing = byBranch.get(branchId);

    if (branchId === current) {
      if (qtyProvided) {
        if (existing) {
          await BranchStock.updateOne(
            { shopId, branchId, productId },
            { $set: { qty } },
          );
        } else {
          toCreate.push({ shopId, branchId, productId, qty });
        }
        currentQty = qty;
      }
    } else if (!existing) {
      toCreate.push({ shopId, branchId, productId, qty: 0 });
    }
  }

  if (toCreate.length) {
    await BranchStock.insertMany(toCreate);
  }

  return { error: null, currentQty };
}

async function deleteBranchStockForProduct(shopId, productId) {
  await BranchStock.deleteMany({ shopId, productId });
}


const createProduct = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('shopId').lean();
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found', success: false });
    }

    const shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
    if (!shopId) {
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

    const {
      productName,
      categoryId,
      categoryName,
      type,
      amount,
      cost,
      barcode,
      productNumber,
      qty,
      productQty,
      isInventoryAvailable: isInventoryAvailableInput,
    } = req.body;

    const productNameTrimmed = productName != null ? String(productName).trim() : '';
    if (!productNameTrimmed) {
      return res.status(400).json({ message: 'Product name is required', success: false });
    }

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: 'Valid category id is required', success: false });
    }

    const categoryNameTrimmed = categoryName != null ? String(categoryName).trim() : '';
    if (!categoryNameTrimmed) {
      return res.status(400).json({ message: 'Category name is required', success: false });
    }

    const category = await Category.findOne({ _id: categoryId, shopId }).lean();
    if (!category) {
      return res.status(404).json({ message: 'Category not found for this shop', success: false });
    }

    const productType = type != null ? String(type).trim().toLowerCase() : 'product';
    if (!['product', 'service'].includes(productType)) {
      return res.status(400).json({
        message: 'Type must be either product or service',
        success: false,
      });
    }

    const productFields = {
      shopId,
      productName: productNameTrimmed,
      categoryId,
      categoryName: categoryNameTrimmed,
      type: productType,
      image: resolveProductImageForCreate(req),
      createdBy: req.user.id,
    };

    let openingStockQty = null;

    if (productType === 'service') {
      Object.assign(productFields, {
        amount: null,
        cost: null,
        isInventoryAvailable: false,
        barcode: null,
      });
    } else {
      if (amount === undefined || amount === null || amount === '') {
        return res.status(400).json({ message: 'Amount is required for product type', success: false });
      }
      const amountNum = Number(amount);
      if (Number.isNaN(amountNum) || amountNum < 0) {
        return res.status(400).json({ message: 'Valid non-negative amount is required', success: false });
      }
      productFields.amount = amountNum;

      if (cost !== undefined && cost !== null && cost !== '') {
        const costNum = Number(cost);
        if (Number.isNaN(costNum) || costNum < 0) {
          return res.status(400).json({ message: 'Valid non-negative cost is required', success: false });
        }
        productFields.cost = costNum;
      } else {
        productFields.cost = null;
      }

      const isInventoryAvailable = parseBooleanInput(isInventoryAvailableInput, false);
      const qtyFields = resolveQtyFields({
        isInventoryAvailable,
        qty: qty !== undefined ? qty : productQty,
        requireQty: isInventoryAvailable,
      });
      if (qtyFields.error) {
        return res.status(400).json({ message: qtyFields.error, success: false });
      }
      productFields.isInventoryAvailable = qtyFields.isInventoryAvailable;

      if (qtyFields.isInventoryAvailable) {
        const branchId = getRequestBranchId(req);
        if (!branchId) {
          return res.status(400).json({
            message: 'Branch id is required to create inventory stock',
            success: false,
          });
        }
        openingStockQty = qtyFields.qty;
      }

      const barcodeError = await assignBarcodeToProductFields(productFields, shopId, barcode);
      if (barcodeError) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: barcodeError, success: false });
      }

      const productNumberError = await assignProductNumberToProductFields(
        productFields,
        shopId,
        productNumber,
      );
      if (productNumberError) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: productNumberError, success: false });
      }
    }

    if (productType === 'service' && productNumber !== undefined) {
      const productNumberError = await assignProductNumberToProductFields(
        productFields,
        shopId,
        productNumber,
      );
      if (productNumberError) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: productNumberError, success: false });
      }
    }

    const shop = await ShopsData.findOne({ shopId }).select('warrantyModule').lean();
    const warrantyError = applyWarrantyFields(productFields, req.body, {
      warrantyModuleEnabled: Boolean(shop?.warrantyModule),
      productType,
      existing: null,
    });
    if (warrantyError) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: warrantyError, success: false });
    }

    const product = await Product.create(productFields);

    if (productFields.isInventoryAvailable) {
      const branchId = getRequestBranchId(req);
      const stockResult = await createBranchStockForProduct({
        shopId,
        productId: product._id,
        currentBranchId: branchId,
        qty: openingStockQty,
      });

      if (stockResult.error) {
        await Product.deleteOne({ _id: product._id, shopId });
        rollbackUploadedFile(req);
        return res.status(400).json({ message: stockResult.error, success: false });
      }
    }

    const populated = await Product.findById(product._id)
      .populate('createdBy', 'name email role')
      .populate('categoryId', 'name description colorCode');

    const data = populated?.toObject ? populated.toObject() : populated;
    data.qty = productFields.isInventoryAvailable ? openingStockQty : null;

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    rollbackUploadedFile(req);
    if (error.code === 11000) {
      return res.status(400).json({
        message: duplicateKeyMessage(error),
        success: false,
      });
    }
    res.status(500).json({ message: error.message, success: false });
  }
};

const getProducts = async (req, res) => {
  try {
    const shopId = req.user?.shopId ? String(req.user.shopId).trim().toUpperCase() : '';
    if (!shopId) {
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

    const branchId = getRequestBranchId(req);

    const listFilter = buildProductListFilter(shopId, {
      productNumber: req.query?.productNumber,
      barcode: req.query?.barcode,
      name: req.query?.name,
      search: req.query?.search,
    });

    const products = await Product.find(listFilter)
      .populate('createdBy', 'name email role')
      .populate('categoryId', 'name description colorCode')
      .sort({ createdAt: -1 });

    const productDocs = products.map((p) => (p.toObject ? p.toObject() : p));

    if (!branchId) {
      const data = productDocs.map((product) => ({
        ...product,
        qty: null,
      }));
      return res.json({
        success: true,
        count: data.length,
        data,
      });
    }

    const productIds = productDocs
      .filter((p) => p.isInventoryAvailable)
      .map((p) => p._id);

    const stocks = productIds.length
      ? await BranchStock.find({
          shopId,
          branchId,
          productId: { $in: productIds },
        })
          .select('productId qty')
          .lean()
      : [];

    const qtyByProductId = new Map(
      stocks.map((s) => [String(s.productId), Number(s.qty) || 0]),
    );

    const data = productDocs.map((product) => ({
      ...product,
      qty: product.isInventoryAvailable
        ? (qtyByProductId.has(String(product._id))
            ? qtyByProductId.get(String(product._id))
            : 0)
        : null,
    }));

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const shopId = getRequestShopId(req);
    if (!shopId) {
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

    const existing = await Product.findOne({ _id: id, shopId });
    if (!existing) {
      return res.status(404).json({ message: 'Product not found', success: false });
    }

    const shop = await ShopsData.findOne({ shopId }).select('warrantyModule').lean();
    const warrantyModuleEnabled = Boolean(shop?.warrantyModule);

    const { productName, categoryId, categoryName, type, amount, cost } = req.body;
    const updates = {};

    if (productName !== undefined) {
      const productNameTrimmed = String(productName).trim();
      if (!productNameTrimmed) {
        return res.status(400).json({ message: 'Product name cannot be empty', success: false });
      }
      updates.productName = productNameTrimmed;
    }

    if (categoryId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ message: 'Valid category id is required', success: false });
      }
      const category = await Category.findOne({ _id: categoryId, shopId }).lean();
      if (!category) {
        return res.status(404).json({ message: 'Category not found for this shop', success: false });
      }
      updates.categoryId = categoryId;
      updates.categoryName = category.name;
    }

    if (categoryName !== undefined && categoryId === undefined) {
      const categoryNameTrimmed = String(categoryName).trim();
      if (!categoryNameTrimmed) {
        return res.status(400).json({ message: 'Category name cannot be empty', success: false });
      }
      updates.categoryName = categoryNameTrimmed;
    }

    const nextType =
      type !== undefined ? String(type).trim().toLowerCase() : existing.type;

    if (type !== undefined && !['product', 'service'].includes(nextType)) {
      return res.status(400).json({
        message: 'Type must be either product or service',
        success: false,
      });
    }

    let stockPlan = {
      inventoryEnabled: Boolean(existing.isInventoryAvailable),
      qty: null,
      qtyProvided: false,
    };

    if (nextType === 'service') {
      applyServiceTypeFields(updates);
      stockPlan = {
        inventoryEnabled: false,
        qty: null,
        qtyProvided: false,
      };
      if (req.body.productNumber !== undefined) {
        const productNumberError = await assignProductNumberToProductFields(
          updates,
          shopId,
          req.body.productNumber,
          existing._id,
        );
        if (productNumberError) {
          rollbackUploadedFile(req);
          return res.status(400).json({ message: productNumberError, success: false });
        }
      }
    } else {
      updates.type = 'product';

      if (amount !== undefined) {
        if (amount === null || amount === '') {
          return res.status(400).json({ message: 'Amount is required for product type', success: false });
        }
        const amountNum = Number(amount);
        if (Number.isNaN(amountNum) || amountNum < 0) {
          return res.status(400).json({ message: 'Valid non-negative amount is required', success: false });
        }
        updates.amount = amountNum;
      }

      if (cost !== undefined) {
        if (cost === null || cost === '') {
          updates.cost = null;
        } else {
          const costNum = Number(cost);
          if (Number.isNaN(costNum) || costNum < 0) {
            return res.status(400).json({ message: 'Valid non-negative cost is required', success: false });
          }
          updates.cost = costNum;
        }
      }

      if (req.body.barcode !== undefined) {
        const barcodeError = await assignBarcodeToProductFields(
          updates,
          shopId,
          req.body.barcode,
          existing._id,
        );
        if (barcodeError) {
          rollbackUploadedFile(req);
          return res.status(400).json({ message: barcodeError, success: false });
        }
      }

      if (req.body.productNumber !== undefined) {
        const productNumberError = await assignProductNumberToProductFields(
          updates,
          shopId,
          req.body.productNumber,
          existing._id,
        );
        if (productNumberError) {
          rollbackUploadedFile(req);
          return res.status(400).json({ message: productNumberError, success: false });
        }
      }

      const inventoryResult = applyInventoryUpdates(updates, existing, req.body);
      if (inventoryResult.error) {
        return res.status(400).json({ message: inventoryResult.error, success: false });
      }
      stockPlan = inventoryResult;

      const warrantyError = applyWarrantyFields(updates, req.body, {
        warrantyModuleEnabled,
        productType: nextType,
        existing,
      });
      if (warrantyError) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: warrantyError, success: false });
      }
    }

    const inventoryTouched =
      nextType === 'service' ||
      req.body.isInventoryAvailable !== undefined ||
      req.body.qty !== undefined ||
      req.body.productQty !== undefined ||
      req.body.warrantyAvailable !== undefined ||
      req.body.warrantyMonths !== undefined;

    applyProductImageUpdate(req, existing, updates);

    if (Object.keys(updates).length === 0 && !inventoryTouched) {
      return res.status(400).json({ message: 'No fields to update', success: false });
    }

    if (stockPlan.inventoryEnabled && inventoryTouched) {
      const branchId = getRequestBranchId(req);
      if (!branchId) {
        return res.status(400).json({
          message: 'Branch id is required to manage inventory stock',
          success: false,
        });
      }
    }

    if (Object.keys(updates).length > 0) {
      Object.assign(existing, updates);
      await existing.save();
    }

    let responseQty = null;

    if (inventoryTouched) {
      if (!stockPlan.inventoryEnabled) {
        await deleteBranchStockForProduct(shopId, existing._id);
        responseQty = null;
      } else {
        const branchId = getRequestBranchId(req);
        const stockResult = await syncBranchStockOnUpdate({
          shopId,
          productId: existing._id,
          currentBranchId: branchId,
          qty: stockPlan.qty,
          qtyProvided: stockPlan.qtyProvided,
        });
        if (stockResult.error) {
          return res.status(400).json({ message: stockResult.error, success: false });
        }
        responseQty = stockResult.currentQty;
      }
    } else if (existing.isInventoryAvailable) {
      const branchId = getRequestBranchId(req);
      if (branchId) {
        const stock = await BranchStock.findOne({
          shopId,
          productId: existing._id,
          branchId,
        })
          .select('qty')
          .lean();
        responseQty = stock?.qty ?? null;
      }
    }

    const product = await Product.findById(existing._id)
      .populate('createdBy', 'name email role')
      .populate('categoryId', 'name description colorCode');

    const data = product?.toObject ? product.toObject() : product;
    data.qty = responseQty;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    rollbackUploadedFile(req);
    if (error.code === 11000) {
      return res.status(400).json({
        message: duplicateKeyMessage(error),
        success: false,
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message, success: false });
    }
    res.status(500).json({ message: error.message, success: false });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const shopId = getRequestShopId(req);
    if (!shopId) {
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

    const product = await Product.findOneAndDelete({ _id: id, shopId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found', success: false });
    }

    await deleteBranchStockForProduct(shopId, product._id);

    if (product.image) {
      unlinkProductImageIfLocal(product.image);
    }

    res.json({
      success: true,
      message: 'Product removed',
      data: {
        id: product._id,
        productName: product.productName,
        shopId: product.shopId,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};

module.exports = {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
};
