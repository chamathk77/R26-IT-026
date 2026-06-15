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

function getItemUnitPrice(item, product) {
  if (item.unitCost != null) {
    return Number(item.unitCost);
  }
  return product ? getProductUnitPrice(product) : 0;
}

function calculateTotalFromItemUnitCosts(items) {
  const total = items.reduce((sum, item) => {
    const unit = item.unitCost ?? 0;
    return sum + unit * item.quantity;
  }, 0);
  return Number(total.toFixed(2));
}

function roundMoney(value) {
  return Number(Math.max(0, value).toFixed(2));
}

function calculateDiscountedAmount(subtotal, discount) {
  if (!discount?.enabled) return 0;

  const discountType = String(discount.type ?? '')
    .trim()
    .toLowerCase();
  const discountValue = Number(discount.value);

  if (!Number.isFinite(discountValue) || discountValue <= 0) return 0;

  if (discountType === 'percent' || discountType === 'percentage') {
    return roundMoney(Math.min(subtotal, (subtotal * discountValue) / 100));
  }

  if (discountType === 'amount') {
    return roundMoney(Math.min(subtotal, discountValue));
  }

  return 0;
}

function applyDiscountFlags(cart, discount) {
  if (discount?.enabled) {
    const discountType = String(discount.type ?? '')
      .trim()
      .toLowerCase();
    const isPercentage = discountType === 'percent' || discountType === 'percentage';
    const isAmount = discountType === 'amount';
    const discountValue = Number(discount.value);

    if ((isPercentage || isAmount) && Number.isFinite(discountValue) && discountValue > 0) {
      cart.isDiscount = true;
      cart.isDiscountPercentage = isPercentage;
      cart.isDiscountAmount = isAmount;
      cart.discount = Number(discountValue.toFixed(isAmount ? 2 : 4));
      return;
    }
  }

  cart.isDiscount = false;
  cart.isDiscountPercentage = false;
  cart.isDiscountAmount = false;
  cart.discount = 0;
  cart.discountedAmount = 0;
}

function normalizeCheckoutDiscount(options = {}) {
  if (options.discount && typeof options.discount === 'object') {
    return {
      ...options.discount,
      enabled: Boolean(options.discount.enabled ?? options.isDiscount),
    };
  }

  if (options.isDiscount) {
    return { enabled: true, type: null, value: null };
  }

  return { enabled: false, type: null, value: null };
}

function isCheckoutClientError(message) {
  if (!message || typeof message !== 'string') return false;

  return (
    message === 'Only added carts can proceed to checkout' ||
    message === 'Cart has no items to proceed' ||
    message.startsWith('Service amount is required for ') ||
    message.startsWith('Valid service amount is required for ') ||
    message === 'Discount value is required when discount is enabled' ||
    message === 'Discount type must be amount or percentage when discount is enabled' ||
    message === 'Percentage discount cannot exceed 100'
  );
}

async function validateCheckoutOptions(cart, options = {}) {
  const shopId = String(cart.shopId).trim().toUpperCase();
  const productMap = await buildProductDetailsMap(
    cart.items.map((item) => item.productId),
    shopId,
  );
  const itemUnitCosts = options.itemUnitCosts ?? {};

  cart.items.forEach((item) => {
    const product = productMap.get(String(item.productId));
    if (product?.type !== 'service') return;

    const override = itemUnitCosts[String(item.productId)];
    if (override === undefined || override === null || override === '') {
      throw new Error(`Service amount is required for ${item.name}`);
    }

    const parsed = Number(override);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Valid service amount is required for ${item.name}`);
    }
  });

  const discount = normalizeCheckoutDiscount(options);
  if (!discount.enabled) {
    return { productMap, discount: null };
  }

  const discountType = String(discount.type ?? '')
    .trim()
    .toLowerCase();
  const isPercentage = discountType === 'percent' || discountType === 'percentage';
  const isAmount = discountType === 'amount';

  if (!isPercentage && !isAmount) {
    throw new Error('Discount type must be amount or percentage when discount is enabled');
  }

  const discountValue = Number(discount.value);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new Error('Discount value is required when discount is enabled');
  }

  if (isPercentage && discountValue > 100) {
    throw new Error('Percentage discount cannot exceed 100');
  }

  return {
    productMap,
    discount: {
      enabled: true,
      type: isPercentage ? 'percent' : 'amount',
      value: discountValue,
    },
  };
}

async function buildProductDetailsMap(productIds, shopId) {
  const uniqueIds = [...new Set(productIds.map((id) => String(id)))];
  if (uniqueIds.length === 0) return new Map();

  const products = await Product.find({ _id: { $in: uniqueIds }, shopId })
    .select('amount cost type')
    .lean();

  return new Map(products.map((product) => [String(product._id), product]));
}

async function finalizeCartForProceed(cart, options = {}) {
  const shopId = String(cart.shopId).trim().toUpperCase();
  const { productMap, discount } = await validateCheckoutOptions(cart, options);
  const itemUnitCosts = options.itemUnitCosts ?? {};

  cart.items.forEach((item) => {
    const product = productMap.get(String(item.productId));
    const override = itemUnitCosts[String(item.productId)];

    if (override !== undefined && override !== null && override !== '') {
      const parsedOverride = Number(override);
      if (!Number.isFinite(parsedOverride) || parsedOverride < 0) {
        throw new Error(`Invalid unit cost for item ${item.name}`);
      }
      item.unitCost = parsedOverride;
      return;
    }

    if (product?.type === 'service') {
      item.unitCost = null;
      return;
    }

    item.unitCost = product?.amount != null ? Number(product.amount) : null;
  });

  applyDiscountFlags(cart, discount ?? { enabled: false });
  cart.totalPrice = calculateTotalFromItemUnitCosts(cart.items);
  cart.discountedAmount = calculateDiscountedAmount(cart.totalPrice, discount);
  return cart;
}

async function proceedCartSession(cart, options = {}) {
  if (cart.status !== 'added') {
    throw new Error('Only added carts can proceed to checkout');
  }

  if (!Array.isArray(cart.items) || cart.items.length === 0) {
    throw new Error('Cart has no items to proceed');
  }

  await finalizeCartForProceed(cart, options);
  cart.status = 'proceed';
  await cart.save();
  return cart;
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
        isDiscount: false,
        isDiscountPercentage: false,
        isDiscountAmount: false,
        discount: 0,
        discountedAmount: 0,
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
  const productMap = await buildProductDetailsMap(productIds, shopId);
  return new Map(
    [...productMap.entries()].map(([id, product]) => [id, getProductUnitPrice(product)]),
  );
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
  const productMap = await buildProductDetailsMap(productIds, shopId);

  return carts.flatMap((cart) =>
    cart.items.map((item) => {
      const product = productMap.get(String(item.productId));
      const unitPrice = getItemUnitPrice(item, product);
      return {
        _id: `${cart._id}:${item.productId}`,
        user: cart.user,
        shopId: cart.shopId,
        sessionId: cart.sessionId,
        cartNumber: cart.cartNumber,
        product: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitCost: item.unitCost ?? null,
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
      cart.items[itemIndex].unitCost = null;
      isUpdate = true;
    } else {
      cart.items.push({
        productId,
        name: productName,
        quantity: qty,
        unitCost: null,
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

    if (statusNormalized === 'proceed') {
      return res.status(400).json({
        success: false,
        message: 'Use POST /api/cart/sessions/:sessionId/checkout to proceed with checkout',
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
      status: cart.status,
      data: items,
      message: 'Cart session status updated',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Checkout added cart: finalize unit costs, discount flags, and set status to proceed. */
const checkoutCartSession = async (req, res) => {
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const cart = await Cart.findOne(
      buildShopCartFilter(shopId, req.user.id, { sessionId, status: 'added' }),
    );

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Added cart session not found',
      });
    }

    await proceedCartSession(cart, {
      discount: req.body?.discount,
      isDiscount: req.body?.isDiscount,
      itemUnitCosts: req.body?.itemUnitCosts,
    });

    const items = await flattenCartItems([cart]);

    res.status(200).json({
      success: true,
      sessionId: cart.sessionId,
      cartNumber: cart.cartNumber,
      status: cart.status,
      isDiscount: cart.isDiscount,
      isDiscountPercentage: cart.isDiscountPercentage,
      isDiscountAmount: cart.isDiscountAmount,
      discount: cart.discount,
      discountedAmount: cart.discountedAmount,
      totalPrice: cart.totalPrice,
      data: items,
      message: 'Cart checked out',
    });
  } catch (error) {
    if (isCheckoutClientError(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }

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
    cart.items[itemIndex].unitCost = null;
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
  checkoutCartSession,
  proceedCartSession,
  updateCartSessionItem,
  removeCartSessionItem,
  deleteCartSession,
  isCheckoutClientError,
};
