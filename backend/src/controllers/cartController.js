const mongoose = require('mongoose');
const Cart = require('../models/cart');
const Product = require('../models/product');

const CART_STATUSES = Cart.CART_STATUSES;

async function buildProductPriceMap(productIds) {
  const uniqueIds = [...new Set(productIds.map((id) => String(id)))];
  if (uniqueIds.length === 0) return new Map();

  const products = await Product.find({ _id: { $in: uniqueIds } })
    .select('price')
    .lean();

  return new Map(products.map((product) => [String(product._id), Number(product.price)]));
}

async function calculateCartTotalPrice(items) {
  const priceMap = await buildProductPriceMap(items.map((item) => item.productId));
  const total = items.reduce((sum, item) => {
    const unitPrice = priceMap.get(String(item.productId)) ?? 0;
    return sum + unitPrice * item.quantity;
  }, 0);
  return Number(total.toFixed(2));
}

function mapCartSessionSummary(cart) {
  return {
    sessionId: cart.sessionId,
    status: cart.status,
    itemCount: cart.items.length,
    totalAmount: Number(cart.totalPrice.toFixed(2)),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

async function flattenCartItems(carts) {
  const productIds = carts.flatMap((cart) => cart.items.map((item) => item.productId));
  const priceMap = await buildProductPriceMap(productIds);

  return carts.flatMap((cart) =>
    cart.items.map((item) => {
      const unitPrice = priceMap.get(String(item.productId)) ?? 0;
      return {
        _id: `${cart._id}:${item.productId}`,
        user: cart.user,
        sessionId: cart.sessionId,
        product: item.productId,
        productName: item.name,
        quantity: item.quantity,
        totalPrice: Number((unitPrice * item.quantity).toFixed(2)),
        status: cart.status,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      };
    }),
  );
}

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

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const pendingCartCount = await Cart.countDocuments({
      user: userId,
      status: 'pending',
    });
    const sessionId = new mongoose.Types.ObjectId();
    const cartNumber = pendingCartCount + 1;

    res.status(201).json({
      success: true,
      sessionId,
      cartNumber,
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

    const filter = { user: userId };
    if (statusFilter) {
      filter.status = statusFilter;
    }

    const carts = await Cart.find(filter).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: carts.map(mapCartSessionSummary),
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

    const carts = await Cart.find(filter).sort({ updatedAt: -1 });
    const items = await flattenCartItems(carts);

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

    let cart = await Cart.findOne({
      user: req.user.id,
      sessionId: sessionObjectId,
    });

    const nextItem = {
      productId,
      name: product.name,
      quantity: qty,
    };

    let isUpdate = false;
    if (cart) {
      const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId));
      if (itemIndex >= 0) {
        cart.items[itemIndex].name = product.name;
        cart.items[itemIndex].quantity = qty;
        isUpdate = true;
      } else {
        cart.items.push(nextItem);
      }
      cart.status = statusNormalized;
      cart.totalPrice = await calculateCartTotalPrice(cart.items);
      await cart.save();
    } else {
      cart = await Cart.create({
        user: req.user.id,
        sessionId: sessionObjectId,
        items: [nextItem],
        totalPrice: Number((Number(product.price) * qty).toFixed(2)),
        status: statusNormalized,
      });
    }

    const [flattenedItem] = await flattenCartItems([cart]);
    const responseItem =
      flattenedItem && String(flattenedItem.product) === String(productId)
        ? flattenedItem
        : {
            _id: `${cart._id}:${productId}`,
            user: cart.user,
            sessionId: cart.sessionId,
            product: productId,
            productName: product.name,
            quantity: qty,
            totalPrice: Number((Number(product.price) * qty).toFixed(2)),
            status: cart.status,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
          };

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      data: responseItem,
      message: isUpdate ? 'Cart item updated' : 'Cart item added',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid cart id' });
    }

    const cart = await Cart.findOne({ _id: id, user: req.user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const { productId, quantity, status } = req.body;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Valid product id is required' });
    }

    const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId));
    if (itemIndex < 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive integer',
        });
      }

      const product = await Product.findById(productId).lean();
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      cart.items[itemIndex].quantity = qty;
      cart.items[itemIndex].name = product.name;
    }

    if (status !== undefined) {
      const statusNormalized = String(status).trim().toLowerCase();
      if (!CART_STATUSES.includes(statusNormalized)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${CART_STATUSES.join(', ')}`,
        });
      }
      cart.status = statusNormalized;
    }

    if (quantity === undefined && status === undefined) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    cart.totalPrice = await calculateCartTotalPrice(cart.items);
    await cart.save();

    const flattenedItems = await flattenCartItems([cart]);
    const responseItem = flattenedItems.find((item) => String(item.product) === String(productId));

    res.status(200).json({
      success: true,
      data: responseItem,
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

    const cart = await Cart.findOneAndUpdate(
      { user: req.user.id, sessionId },
      { $set: { status: statusNormalized } },
      { new: true, runValidators: true },
    );

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    const items = await flattenCartItems([cart]);

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

const updateCartSessionItem = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const { productId, quantity } = req.body;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Valid product id is required' });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer',
      });
    }

    const cart = await Cart.findOne({ user: req.user.id, sessionId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId));
    if (itemIndex < 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    cart.items[itemIndex].quantity = qty;
    cart.items[itemIndex].name = product.name;
    cart.totalPrice = await calculateCartTotalPrice(cart.items);
    await cart.save();

    const items = await flattenCartItems([cart]);

    res.status(200).json({
      success: true,
      sessionId,
      totalPrice: cart.totalPrice,
      data: items,
      message: 'Cart item updated',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

async function removeItemFromCart(cart, productId) {
  const nextItems = cart.items.filter((item) => String(item.productId) !== String(productId));

  if (nextItems.length === cart.items.length) {
    return { found: false };
  }

  if (nextItems.length === 0) {
    await Cart.findByIdAndDelete(cart._id);
    return {
      found: true,
      sessionId: cart.sessionId,
      cartDeleted: true,
      totalPrice: 0,
      data: [],
      message: 'Cart session deleted',
    };
  }

  cart.items = nextItems;
  cart.totalPrice = await calculateCartTotalPrice(cart.items);
  await cart.save();

  const items = await flattenCartItems([cart]);

  return {
    found: true,
    sessionId: cart.sessionId,
    cartDeleted: false,
    totalPrice: cart.totalPrice,
    data: items,
    message: 'Cart item removed',
  };
}

const removeCartSessionItem = async (req, res) => {
  try {
    const { sessionId, productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Valid product id is required' });
    }

    const cart = await Cart.findOne({ user: req.user.id, sessionId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    const result = await removeItemFromCart(cart, productId);
    if (!result.found) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.status(200).json({
      success: true,
      sessionId: result.sessionId,
      cartDeleted: result.cartDeleted,
      totalPrice: result.totalPrice,
      data: result.data,
      message: result.message,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCartSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const cart = await Cart.findOneAndDelete({ user: req.user.id, sessionId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    res.status(200).json({
      success: true,
      sessionId,
      message: 'Cart session deleted',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { productId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid cart id' });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Valid product id is required' });
    }

    const cart = await Cart.findOne({ _id: id, user: req.user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const result = await removeItemFromCart(cart, productId);
    if (!result.found) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.status(200).json({
      success: true,
      id: cart._id,
      sessionId: result.sessionId,
      cartDeleted: result.cartDeleted,
      totalPrice: result.totalPrice,
      data: result.data,
      message: result.message,
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
  updateCartSessionItem,
  removeCartSessionItem,
  deleteCartSession,
  removeCartItem,
};
