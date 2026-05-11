const mongoose = require('mongoose');
const Cart = require('../models/cart');
const Product = require('../models/product');

const CART_STATUSES = Cart.CART_STATUSES;

const createCartSession = async (req, res) => {
  try {
    const statusRaw = req.body?.status;
    const status =
      statusRaw === undefined || statusRaw === null
        ? 'added'
        : String(statusRaw).trim().toLowerCase();

    if (!CART_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${CART_STATUSES.join(', ')}`,
      });
    }

    res.status(201).json({
      success: true,
      sessionId: new mongoose.Types.ObjectId(),
      status,
      message: 'Cart session created',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCartSessions = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const statusRaw = req.query?.status;
    const statusFilter =
      statusRaw === undefined || statusRaw === null
        ? null
        : String(statusRaw).trim().toLowerCase();

    if (statusFilter && !CART_STATUSES.includes(statusFilter)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${CART_STATUSES.join(', ')}`,
      });
    }

    const match = { user: userId };
    if (statusFilter) {
      match.status = statusFilter;
    }

    const sessions = await Cart.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$sessionId',
          status: { $last: '$status' },
          itemCount: { $sum: 1 },
          totalAmount: { $sum: '$totalPrice' },
          updatedAt: { $max: '$updatedAt' },
          createdAt: { $min: '$createdAt' },
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: sessions.map((session) => ({
        sessionId: session._id,
        status: session.status,
        itemCount: session.itemCount,
        totalAmount: Number(session.totalAmount.toFixed(2)),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
      message: 'Cart sessions loaded',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCartItems = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const statusRaw = req.query?.status;
    const statusFilter =
      statusRaw === undefined || statusRaw === null
        ? null
        : String(statusRaw).trim().toLowerCase();
    const filter = { user: req.user.id };

    if (sessionId !== undefined && sessionId !== null && sessionId !== '') {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ success: false, message: 'Invalid session id' });
      }
      filter.sessionId = sessionId;
    }

    if (statusFilter) {
      if (!CART_STATUSES.includes(statusFilter)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${CART_STATUSES.join(', ')}`,
        });
      }
      filter.status = statusFilter;
    }

    const items = await Cart.find(filter)
      .populate('product', 'name price image category')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: items,
      message: 'Cart items loaded',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addCartItem = async (req, res) => {
  try {
    const { productId, quantity, sessionId, status } = req.body;
    const statusNormalized =
      status === undefined || status === null
        ? 'added'
        : String(status).trim().toLowerCase();

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Valid product id is required' });
    }

    if (!CART_STATUSES.includes(statusNormalized)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${CART_STATUSES.join(', ')}`,
      });
    }

    const qty = quantity === undefined ? 1 : Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer',
      });
    }

    let sessionObjectId = sessionId;
    if (sessionObjectId === undefined || sessionObjectId === null || sessionObjectId === '') {
      sessionObjectId = new mongoose.Types.ObjectId();
    } else if (!mongoose.Types.ObjectId.isValid(sessionObjectId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const totalPrice = Number((Number(product.price) * qty).toFixed(2));
    const existing = await Cart.findOne({
      user: req.user.id,
      sessionId: sessionObjectId,
      product: productId,
    });

    let item;
    if (existing) {
      existing.productName = product.name;
      existing.quantity = qty;
      existing.totalPrice = totalPrice;
      existing.status = statusNormalized;
      item = await existing.save();
    } else {
      item = await Cart.create({
        user: req.user.id,
        sessionId: sessionObjectId,
        product: productId,
        productName: product.name,
        quantity: qty,
        totalPrice,
        status: statusNormalized,
      });
    }

    const populated = await Cart.findById(item._id).populate('product', 'name price image category');

    res.status(existing ? 200 : 201).json({
      success: true,
      data: populated,
      message: existing ? 'Cart item updated' : 'Cart item added',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid cart item id' });
    }

    const item = await Cart.findOne({ _id: id, user: req.user.id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    const { quantity, status } = req.body;
    const updates = {};

    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive integer',
        });
      }
      updates.quantity = qty;
    }

    if (status !== undefined) {
      const statusNormalized = String(status).trim().toLowerCase();
      if (!CART_STATUSES.includes(statusNormalized)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${CART_STATUSES.join(', ')}`,
        });
      }
      updates.status = statusNormalized;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    if (updates.quantity !== undefined) {
      const product = await Product.findById(item.product).lean();
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      updates.productName = product.name;
      updates.totalPrice = Number((Number(product.price) * updates.quantity).toFixed(2));
    }

    const updated = await Cart.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('product', 'name price image category');

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Cart item updated',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCartSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const statusRaw = req.body?.status;
    if (statusRaw === undefined || statusRaw === null || String(statusRaw).trim() === '') {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const statusNormalized = String(statusRaw).trim().toLowerCase();
    if (!CART_STATUSES.includes(statusNormalized)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${CART_STATUSES.join(', ')}`,
      });
    }

    const result = await Cart.updateMany(
      { user: req.user.id, sessionId },
      { $set: { status: statusNormalized } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    const items = await Cart.find({ user: req.user.id, sessionId })
      .populate('product', 'name price image category')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      sessionId,
      status: statusNormalized,
      data: items,
      message: 'Cart session status updated',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid cart item id' });
    }

    const item = await Cart.findOneAndDelete({ _id: id, user: req.user.id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.status(200).json({
      success: true,
      id: item._id,
      message: 'Cart item removed',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCartSession,
  getCartSessions,
  getCartItems,
  addCartItem,
  updateCartItem,
  updateCartSessionStatus,
  removeCartItem,
};
