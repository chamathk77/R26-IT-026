const mongoose = require('mongoose');
const Product = require('../models/product');
const Category = require('../models/category');
const User = require('../models/user');
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

function applyServiceTypeFields(updates) {
  updates.type = 'service';
  updates.isInventoryAvailable = false;
  updates.amount = null;
  updates.qty = null;
  updates.barcode = null;
  updates.cost = null;
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

function duplicateKeyMessage(error) {
  const keyPattern = error?.keyPattern || {};
  if (keyPattern.barcode) {
    return 'A product with this barcode already exists for this shop';
  }
  return 'Duplicate product value for this shop';
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

  if (!effectiveInventory) {
    updates.qty = null;
    return null;
  }

  if (inventoryToggled && nextInventoryAvailable) {
    const resolved = resolveQtyFields({
      isInventoryAvailable: true,
      qty: qtyInput !== undefined ? qtyInput : existing.qty,
      requireQty: true,
    });
    if (resolved.error) {
      return resolved.error;
    }
    updates.qty = resolved.qty;
    return null;
  }

  if (qtyInput !== undefined) {
    const resolved = resolveQtyFields({
      isInventoryAvailable: true,
      qty: qtyInput,
      requireQty: true,
    });
    if (resolved.error) {
      return resolved.error;
    }
    updates.qty = resolved.qty;
  }

  return null;
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

    if (productType === 'service') {
      Object.assign(productFields, {
        amount: null,
        cost: null,
        isInventoryAvailable: false,
        barcode: null,
        qty: null,
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
      productFields.qty = qtyFields.qty;

      const barcodeError = await assignBarcodeToProductFields(productFields, shopId, barcode);
      if (barcodeError) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: barcodeError, success: false });
      }
    }

    const product = await Product.create(productFields);

    const populated = await Product.findById(product._id)
      .populate('createdBy', 'name email role')
      .populate('categoryId', 'name description colorCode');

    res.status(201).json({
      success: true,
      data: populated,
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

    const products = await Product.find({ shopId })
      .populate('createdBy', 'name email role')
      .populate('categoryId', 'name description colorCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: products.length,
      data: products,
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

    if (nextType === 'service') {
      applyServiceTypeFields(updates);
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

      const inventoryError = applyInventoryUpdates(updates, existing, req.body);
      if (inventoryError) {
        return res.status(400).json({ message: inventoryError, success: false });
      }
    }

    applyProductImageUpdate(req, existing, updates);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update', success: false });
    }

    Object.assign(existing, updates);
    await existing.save();

    const product = await Product.findById(existing._id)
      .populate('createdBy', 'name email role')
      .populate('categoryId', 'name description colorCode');

    res.json({
      success: true,
      data: product,
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
