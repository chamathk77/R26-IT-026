const mongoose = require('mongoose');
const Product = require('../models/product');
const Category = require('../models/category');
const ShopsData = require('../models/shopsData');
const User = require('../models/user');
const { publicImagePath, unlinkProductImageIfLocal } = require('../middleware/uploadProductImage');

function invalidIdResponse(res) {
  return res.status(400).json({ message: 'Invalid product id', success: false });
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

    const shop = await ShopsData.findOne({ shopId }).select('manageInventory').lean();
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found', success: false });
    }

    const isInventoryAvailable = Boolean(shop.manageInventory);
    const { productName, categoryId, categoryName, barcode, productQty } = req.body;

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

    let barcodeValue = null;
    let productQtyValue = 0;

    if (isInventoryAvailable) {
      const barcodeTrimmed = barcode != null ? String(barcode).trim() : '';
      if (!barcodeTrimmed) {
        return res.status(400).json({ message: 'Barcode is required when inventory is enabled', success: false });
      }

      if (productQty === undefined || productQty === null || Number.isNaN(Number(productQty))) {
        return res
          .status(400)
          .json({ message: 'Product quantity is required when inventory is enabled', success: false });
      }

      productQtyValue = Number(productQty);
      if (productQtyValue < 0) {
        return res.status(400).json({ message: 'Product quantity must be zero or positive', success: false });
      }

      barcodeValue = barcodeTrimmed;
    }

    const product = await Product.create({
      shopId,
      productName: productNameTrimmed,
      categoryId,
      categoryName: categoryNameTrimmed,
      barcode: barcodeValue,
      productQty: productQtyValue,
      createdBy: req.user.id,
    });

    const populated = await Product.findById(product._id)
      .populate('createdBy', 'name email role')
      .populate('categoryId', 'name description colorCode');

    res.status(201).json({
      success: true,
      isInventoryAvailable,
      data: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A product with this barcode already exists for this shop',
        success: false,
      });
    }
    res.status(500).json({ message: error.message, success: false });
  }
};

const getProducts = async (_req, res) => {
  try {
    const products = await Product.find()
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: products });
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

    const { name, category, price, image } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (category !== undefined) updates.category = String(category).trim();
    if (price !== undefined) {
      const priceNum = Number(price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ message: 'Valid non-negative price is required', success: false });
      }
      updates.price = priceNum;
    }

    if (req.file) {
      const existing = await Product.findById(id).select('image').lean();
      if (existing?.image) {
        unlinkProductImageIfLocal(existing.image);
      }
      updates.image = publicImagePath(req.file.filename);
    } else if (image !== undefined) {
      updates.image = String(image);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update', success: false });
    }

    const product = await Product.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('createdBy', 'name email role');

    if (!product) {
      if (req.file) {
        unlinkProductImageIfLocal(publicImagePath(req.file.filename));
      }
      return res.status(404).json({ message: 'Product not found', success: false });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    if (req.file) {
      unlinkProductImageIfLocal(publicImagePath(req.file.filename));
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

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found', success: false });
    }

    if (product.image) {
      unlinkProductImageIfLocal(product.image);
    }

    res.json({ success: true, message: 'Product removed', id: product._id });
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
