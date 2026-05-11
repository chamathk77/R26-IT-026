const mongoose = require('mongoose');
const Product = require('../models/product');
const { publicImagePath, unlinkProductImageIfLocal } = require('../middleware/uploadProductImage');

function invalidIdResponse(res) {
  return res.status(400).json({ message: 'Invalid product id', success: false });
}

const createProduct = async (req, res) => {
  try {
    const { name, category, price, image } = req.body;

    if (name === undefined || name === '') {
      return res.status(400).json({ message: 'Name is required', success: false });
    }
    if (category === undefined || category === '') {
      return res.status(400).json({ message: 'Category is required', success: false });
    }
    if (price === undefined || price === null || Number.isNaN(Number(price))) {
      return res.status(400).json({ message: 'Valid price is required', success: false });
    }

    const priceNum = Number(price);
    if (priceNum < 0) {
      return res.status(400).json({ message: 'Price must be zero or positive', success: false });
    }

    let imageValue = '';
    if (req.file) {
      imageValue = publicImagePath(req.file.filename);
    } else if (image != null && String(image).trim() !== '') {
      imageValue = String(image).trim();
    }

    const product = await Product.create({
      name: String(name).trim(),
      category: String(category).trim(),
      price: priceNum,
      image: imageValue,
      createdBy: req.user.id,
    });

    const populated = await Product.findById(product._id).populate('createdBy', 'name email role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    if (req.file) {
      unlinkProductImageIfLocal(publicImagePath(req.file.filename));
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
      new: true,
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
