const mongoose = require('mongoose');
const Product = require('../models/product');

function invalidIdResponse(res) {
  return res.status(400).json({ message: 'Invalid product id' });
}

const createProduct = async (req, res) => {
  try {
    const { name, category, price, image } = req.body;

    if (name === undefined || name === '') {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (category === undefined || category === '') {
      return res.status(400).json({ message: 'Category is required' });
    }
    if (price === undefined || price === null || Number.isNaN(Number(price))) {
      return res.status(400).json({ message: 'Valid price is required' });
    }

    const priceNum = Number(price);
    if (priceNum < 0) {
      return res.status(400).json({ message: 'Price must be zero or positive' });
    }

    const product = await Product.create({
      name: String(name).trim(),
      category: String(category).trim(),
      price: priceNum,
      image: image != null ? String(image) : '',
      createdBy: req.user.id,
    });

    const populated = await Product.findById(product._id).populate('createdBy', 'name email role');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
        return res.status(400).json({ message: 'Valid non-negative price is required' });
      }
      updates.price = priceNum;
    }
    if (image !== undefined) updates.image = String(image);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email role');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product removed', id: product._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
};
