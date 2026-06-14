const mongoose = require('mongoose');
const Cart = require('../models/cart');
const Product = require('../models/product');

const CART_STATUSES = Cart.CART_STATUSES;

function getRequestShopId(req) {
  return req.user?.shopId ? String(req.user.shopId).trim().toUpperCase() : '';
}

function requireShopId(req, res) {
  const shopId = getRequestShopId(req);
  if (!shopId) {
    res.status(400).json({ success: false, message: 'Shop id is required' });
    return null;
  }
  return shopId;
}

function buildShopCartFilter(shopId, userId, extra = {}) {
  return { shopId, user: userId, ...extra };
}

function getProductUnitPrice(product) {
  return product?.amount == null ? 0 : Number(product.amount);
}

async function getNextCartNumber(shopId) {
  const normalizedShopId = String(shopId).trim().toUpperCase();
  const latest = await Cart.findOne({ shopId: normalizedShopId })
    .sort({ cartNumber: -1 })
    .select('cartNumber')
    .lean();

  let candidate = (latest?.cartNumber ?? 0) + 1;

  // One shop cannot reuse the same cart number.
  while (await Cart.exists({ shopId: normalizedShopId, cartNumber: candidate })) {
    candidate += 1;
  }

  return candidate;
}

async function createPendingCart({ shopId, userId, sessionId }) {
  const MAX_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const cartNumber = await getNextCartNumber(shopId);

    try {
      return await Cart.create({
        shopId,
        user: userId,
        sessionId,
        cartNumber,
        items: [],
        totalPrice: 0,
        status: 'pending',
      });
    } catch (error) {
      const isDuplicateCartNumber =
        error.code === 11000 &&
        error.keyPattern &&
        Object.prototype.hasOwnProperty.call(error.keyPattern, 'cartNumber');

      if (isDuplicateCartNumber && attempt < MAX_ATTEMPTS - 1) {
        continue;
      }

      throw error;
    }
  }

  throw new Error('Could not assign a unique cart number for this shop');
}

async function buildProductPriceMap(productIds, shopId) {
  const uniqueIds = [...new Set(productIds.map((id) => String(id)))];
  if (uniqueIds.length === 0) return new Map();

  const products = await Product.find({ _id: { $in: uniqueIds }, shopId })
    .select('amount')
    .lean();

  return new Map(products.map((product) => [String(product._id), getProductUnitPrice(product)]));
}

async function calculateCartTotalPrice(items, shopId) {
  const priceMap = await buildProductPriceMap(
    items.map((item) => item.productId),
    shopId,
  );
  const total = items.reduce((sum, item) => {
    const unitPrice = priceMap.get(String(item.productId)) ?? 0;
    return sum + unitPrice * item.quantity;
  }, 0);
  return Number(total.toFixed(2));
}

function mapCartSessionSummary(cart) {
  return {
    sessionId: cart.sessionId,
    cartNumber: cart.cartNumber,
    shopId: cart.shopId,
    status: cart.status,
    itemCount: cart.items.length,
    totalAmount: Number(cart.totalPrice.toFixed(2)),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

async function flattenCartItems(carts) {
  const productIds = carts.flatMap((cart) => cart.items.map((item) => item.productId));
  const shopId = carts[0]?.shopId ? String(carts[0].shopId).trim().toUpperCase() : '';
  const priceMap = await buildProductPriceMap(productIds, shopId);

  return carts.flatMap((cart) =>
    cart.items.map((item) => {
      const unitPrice = priceMap.get(String(item.productId)) ?? 0;
      return {
        _id: `${cart._id}:${item.productId}`,
        user: cart.user,
        shopId: cart.shopId,
        sessionId: cart.sessionId,
        cartNumber: cart.cartNumber,
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

/** Create empty pending cart when user starts a new order (+ icon flow). */
const createCartSession = async (req, res) => {
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const sessionId = new mongoose.Types.ObjectId();

    const cart = await createPendingCart({
      shopId,
      userId: req.user.id,
      sessionId,
    });

    res.status(201).json({
      success: true,
      sessionId: cart.sessionId,
      cartNumber: cart.cartNumber,
      shopId: cart.shopId,
      status: cart.status,
      message: 'Pending cart created',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This cart number already exists for your shop. Please retry.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCartSessions = async (req, res) => {
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

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

    const filter = buildShopCartFilter(shopId, req.user.id);
    if (statusFilter) {
      filter.status = statusFilter;
    }

    const carts = await Cart.find(filter).sort({ cartNumber: 1 });

    res.status(200).json({
      success: true,
      shopId,
      data: carts.map(mapCartSessionSummary),
      message: 'Cart sessions loaded',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCartItems = async (req, res) => {
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const { sessionId } = req.query;
    const statusRaw = req.query?.status;
    const statusFilter =
      statusRaw === undefined || statusRaw === null
        ? null
        : String(statusRaw).trim().toLowerCase();

    const filter = buildShopCartFilter(shopId, req.user.id);

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

    const carts = await Cart.find(filter).sort({ cartNumber: 1 });
    const items = await flattenCartItems(carts);

    res.status(200).json({
      success: true,
      shopId,
      data: items,
      message: 'Cart items loaded',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Add or update a product line on an existing cart (cart must be created first). */
const addCartItem = async (req, res) => {
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const { productId, quantity, sessionId } = req.body;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid session id is required. Create a cart first.',
      });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Valid product id is required' });
    }

    const qty = quantity === undefined ? 1 : Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer',
      });
    }

    const cart = await Cart.findOne(buildShopCartFilter(shopId, req.user.id, { sessionId }));
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found. Create a pending cart first.',
      });
    }

    if (cart.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Items can only be added to pending carts',
      });
    }

    const product = await Product.findOne({ _id: productId, shopId }).lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found for this shop',
      });
    }

    const productName = product.productName;
    const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId));
    let isUpdate = false;

    if (itemIndex >= 0) {
      cart.items[itemIndex].name = productName;
      cart.items[itemIndex].quantity = qty;
      isUpdate = true;
    } else {
      cart.items.push({
        productId,
        name: productName,
        quantity: qty,
      });
    }

    cart.totalPrice = await calculateCartTotalPrice(cart.items, shopId);
    await cart.save();

    const [flattenedItem] = await flattenCartItems([cart]);
    const responseItem =
      flattenedItem && String(flattenedItem.product) === String(productId)
        ? flattenedItem
        : {
            _id: `${cart._id}:${productId}`,
            user: cart.user,
            shopId: cart.shopId,
            sessionId: cart.sessionId,
            cartNumber: cart.cartNumber,
            product: productId,
            productName,
            quantity: qty,
            totalPrice: Number((getProductUnitPrice(product) * qty).toFixed(2)),
            status: cart.status,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
          };

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      sessionId: cart.sessionId,
      cartNumber: cart.cartNumber,
      status: cart.status,
      data: responseItem,
      message: isUpdate ? 'Cart item updated' : 'Cart item added',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCartSessionStatus = async (req, res) => {
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

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
      buildShopCartFilter(shopId, req.user.id, { sessionId }),
      { $set: { status: statusNormalized } },
      { returnDocument: 'after', runValidators: true },
    );

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    const items = await flattenCartItems([cart]);

    res.status(200).json({
      success: true,
      sessionId,
      cartNumber: cart.cartNumber,
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
    const shopId = requireShopId(req, res);
    if (!shopId) return;

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

    const cart = await Cart.findOne(buildShopCartFilter(shopId, req.user.id, { sessionId }));
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId));
    if (itemIndex < 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    const product = await Product.findOne({ _id: productId, shopId }).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found for this shop' });
    }

    cart.items[itemIndex].quantity = qty;
    cart.items[itemIndex].name = product.productName;
    cart.totalPrice = await calculateCartTotalPrice(cart.items, shopId);
    await cart.save();

    const items = await flattenCartItems([cart]);

    res.status(200).json({
      success: true,
      sessionId,
      cartNumber: cart.cartNumber,
      totalPrice: cart.totalPrice,
      data: items,
      message: 'Cart item updated',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

async function removeItemFromCart(cart, productId, shopId) {
  const nextItems = cart.items.filter((item) => String(item.productId) !== String(productId));

  if (nextItems.length === cart.items.length) {
    return { found: false };
  }

  if (nextItems.length === 0) {
    await Cart.findByIdAndDelete(cart._id);
    return {
      found: true,
      sessionId: cart.sessionId,
      cartNumber: cart.cartNumber,
      cartDeleted: true,
      totalPrice: 0,
      data: [],
      message: 'Cart session deleted',
    };
  }

  cart.items = nextItems;
  cart.totalPrice = await calculateCartTotalPrice(cart.items, shopId);
  await cart.save();

  const items = await flattenCartItems([cart]);

  return {
    found: true,
    sessionId: cart.sessionId,
    cartNumber: cart.cartNumber,
    cartDeleted: false,
    totalPrice: cart.totalPrice,
    data: items,
    message: 'Cart item removed',
  };
}

const removeCartSessionItem = async (req, res) => {
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const { sessionId, productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Valid product id is required' });
    }

    const cart = await Cart.findOne(buildShopCartFilter(shopId, req.user.id, { sessionId }));
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    const result = await removeItemFromCart(cart, productId, shopId);
    if (!result.found) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.status(200).json({
      success: true,
      sessionId: result.sessionId,
      cartNumber: result.cartNumber,
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
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const cart = await Cart.findOneAndDelete(
      buildShopCartFilter(shopId, req.user.id, { sessionId }),
    );

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    res.status(200).json({
      success: true,
      sessionId,
      cartNumber: cart.cartNumber,
      message: 'Cart session deleted',
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
  updateCartSessionStatus,
  updateCartSessionItem,
  removeCartSessionItem,
  deleteCartSession,
};
