const mongoose = require('mongoose');
const Cart = require('../models/cart');
const History = require('../models/history');
const Product = require('../models/product');
const BranchStock = require('../models/branchStock');
const ShopTable = require('../models/restaurant/shopTable');
const ShopsData = require('../models/shopsData');
const {
  calculateBillTotalsFromCart,
} = require('../services/billingCalculationService');
const { getNextCartNumber } = require('../services/cartNumberService');
const {
  shopHasKitchenOrders,
  createKitchenTicketsFromCart,
  completeKitchenTicketsForSession,
  mapKitchenTicket,
  deleteKitchenTicketsForSession,
} = require('../services/restaurant/kitchenTicketService');

const CART_STATUSES = Cart.CART_STATUSES;
const CART_ORDER_TYPES = Cart.CART_ORDER_TYPES;
const OPEN_TABLE_CART_STATUSES = Cart.OPEN_TABLE_CART_STATUSES;
const MANUAL_CART_STATUS = Cart.MANUAL_CART_STATUS;
/** Statuses reachable through the POS cart endpoints ('manual' is customer-order only). */
const POS_CART_STATUSES = CART_STATUSES.filter((status) => status !== MANUAL_CART_STATUS);

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function normalizeBranchId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function getRequestShopId(req) {
  return normalizeShopId(req.user?.shopId);
}

function getRequestBranchId(req) {
  return normalizeBranchId(req.user?.branchId);
}

function requireShopId(req, res) {
  const shopId = getRequestShopId(req);
  if (!shopId) {
    res.status(400).json({ success: false, message: 'Shop id is required' });
    return null;
  }
  return shopId;
}

/** Requires shopId + branchId from token for all cart operations. */
function requireShopAndBranchId(req, res) {
  const shopId = requireShopId(req, res);
  if (!shopId) return null;

  const branchId = getRequestBranchId(req);
  if (!branchId) {
    res.status(400).json({ success: false, message: 'Branch id is required' });
    return null;
  }

  return { shopId, branchId };
}

function buildShopCartFilter(shopId, branchId, userId, extra = {}) {
  return {
    shopId: normalizeShopId(shopId),
    branchId: normalizeBranchId(branchId),
    user: userId,
    ...extra,
  };
}

function assertCartAccess(cart, shopId, branchId, userId) {
  if (!cart) {
    throw new Error('Cart session not found');
  }

  const normalizedShopId = normalizeShopId(shopId);
  const cartShopId = normalizeShopId(cart.shopId);
  const normalizedBranchId = normalizeBranchId(branchId);
  const cartBranchId = normalizeBranchId(cart.branchId);

  if (!normalizedShopId || cartShopId !== normalizedShopId) {
    throw new Error('Cart session not found for this shop');
  }

  if (!normalizedBranchId || cartBranchId !== normalizedBranchId) {
    throw new Error('Cart session not found for this branch');
  }

  if (String(cart.user) !== String(userId)) {
    throw new Error('Cart session not found for this user');
  }
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

const KITCHEN_QTY_LOCKED_MESSAGE =
  'Cancel the kitchen order first before reducing this item quantity.';

function getKitchenSentQuantity(cartItem) {
  return Math.max(0, Number(cartItem?.kitchenSentQuantity ?? 0));
}

function assertQuantityNotBelowKitchenSent(cartItem, nextQuantity) {
  const sentQty = getKitchenSentQuantity(cartItem);
  if (nextQuantity < sentQty) {
    const error = new Error(KITCHEN_QTY_LOCKED_MESSAGE);
    error.code = 'KITCHEN_QTY_LOCKED';
    throw error;
  }
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
    message.startsWith('Insufficient stock for ') ||
    message === 'Branch id is required' ||
    message === 'Discount value is required when discount is enabled' ||
    message === 'Discount type must be amount or percentage when discount is enabled' ||
    message === 'Percentage discount cannot exceed 100'
  );
}

function aggregateInventoryRequirements(cart) {
  const requirements = new Map();

  cart.items.forEach((item) => {
    const productId = String(item.productId);
    const quantity = Number(item.quantity);
    const existing = requirements.get(productId);

    if (existing) {
      existing.quantity += quantity;
      return;
    }

    requirements.set(productId, {
      productId,
      quantity,
      itemName: item.name,
    });
  });

  return requirements;
}

function getInventoryProductLabel(product, fallbackName) {
  return product?.productName?.trim() || fallbackName || 'Product';
}

async function rollbackInventoryDeductions(shopId, branchId, deductions) {
  if (!deductions.length) return;

  await Promise.all(
    deductions.map(({ productId, quantity }) =>
      BranchStock.updateOne(
        { shopId, branchId, productId },
        { $inc: { qty: quantity } },
      ),
    ),
  );
}

async function validateAndDeductInventory(cart, productMap) {
  const shopId = normalizeShopId(cart.shopId);
  const branchId = normalizeBranchId(cart.branchId);
  if (!branchId) {
    throw new Error('Branch id is required');
  }

  const requirements = aggregateInventoryRequirements(cart);
  const deductions = [];

  const inventoryProductIds = [...requirements.values()]
    .filter((requirement) => productMap.get(requirement.productId)?.isInventoryAvailable)
    .map((requirement) => requirement.productId);

  const stocks = inventoryProductIds.length
    ? await BranchStock.find({
        shopId,
        branchId,
        productId: { $in: inventoryProductIds },
      })
        .select('productId qty')
        .lean()
    : [];

  const qtyByProductId = new Map(
    stocks.map((stock) => [String(stock.productId), Number(stock.qty) || 0]),
  );

  try {
    for (const requirement of requirements.values()) {
      const product = productMap.get(requirement.productId);
      if (!product?.isInventoryAvailable) continue;

      const availableQty = qtyByProductId.get(requirement.productId) ?? 0;
      const label = getInventoryProductLabel(product, requirement.itemName);

      if (!Number.isFinite(requirement.quantity) || requirement.quantity <= 0) {
        throw new Error(`Invalid quantity for ${label}`);
      }

      if (requirement.quantity > availableQty) {
        throw new Error(
          `Insufficient stock for ${label}. Available: ${availableQty}, requested: ${requirement.quantity}`,
        );
      }
    }

    for (const requirement of requirements.values()) {
      const product = productMap.get(requirement.productId);
      if (!product?.isInventoryAvailable) continue;

      const label = getInventoryProductLabel(product, requirement.itemName);
      const updated = await BranchStock.findOneAndUpdate(
        {
          shopId,
          branchId,
          productId: requirement.productId,
          qty: { $gte: requirement.quantity },
        },
        { $inc: { qty: -requirement.quantity } },
        { returnDocument: 'after' },
      );

      if (!updated) {
        throw new Error(
          `Insufficient stock for ${label}. Please refresh and try again.`,
        );
      }

      deductions.push({
        productId: requirement.productId,
        quantity: requirement.quantity,
      });
    }
  } catch (error) {
    await rollbackInventoryDeductions(shopId, branchId, deductions);
    throw error;
  }
}

async function validateCheckoutOptions(cart, options = {}) {
  const shopId = normalizeShopId(cart.shopId);
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
  const normalizedShopId = normalizeShopId(shopId);
  const uniqueIds = [...new Set(productIds.map((id) => String(id)))];
  if (uniqueIds.length === 0 || !normalizedShopId) return new Map();

  const products = await Product.find({ _id: { $in: uniqueIds }, shopId: normalizedShopId })
    .select('amount cost type isInventoryAvailable productName')
    .lean();

  return new Map(products.map((product) => [String(product._id), product]));
}

async function finalizeCartForProceed(cart, options = {}) {
  const shopId = normalizeShopId(cart.shopId);
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

  const shop = await ShopsData.findOne({ shopId }).select('billingConfig').lean();
  const billingTotals = calculateBillTotalsFromCart(cart, shop?.billingConfig);
  cart.taxAmount = billingTotals.taxAmount;
  cart.serviceChargeAmount = billingTotals.serviceChargeAmount;
  cart.taxBreakdown = billingTotals.taxBreakdown;
  cart.serviceChargeBreakdown = billingTotals.serviceChargeBreakdown;
  cart.grandTotal = billingTotals.totalAmount;

  return { cart, productMap, billingTotals };
}

async function proceedCartSession(cart, options = {}) {
  if (options.shopId && options.userId) {
    assertCartAccess(
      cart,
      options.shopId,
      options.branchId ?? cart.branchId,
      options.userId,
    );
  }

  if (cart.status !== 'added') {
    throw new Error('Only added carts can proceed to checkout');
  }

  if (!Array.isArray(cart.items) || cart.items.length === 0) {
    throw new Error('Cart has no items to proceed');
  }

  const { productMap } = await finalizeCartForProceed(cart, options);
  await validateAndDeductInventory(cart, productMap);
  cart.status = 'proceed';
  await cart.save();
  return cart;
}

async function createPendingCart({ shopId, branchId, userId, sessionId, orderMeta = {} }) {
  const normalizedShopId = normalizeShopId(shopId);
  const normalizedBranchId = normalizeBranchId(branchId);
  if (!normalizedShopId) {
    throw new Error('Shop id is required');
  }
  if (!normalizedBranchId) {
    throw new Error('Branch id is required');
  }

  const MAX_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const cartNumber = await getNextCartNumber(normalizedShopId, normalizedBranchId);

    try {
      return await Cart.create({
        shopId: normalizedShopId,
        branchId: normalizedBranchId,
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
        orderType: orderMeta.orderType ?? null,
        tableId: orderMeta.tableId ?? null,
        orderLabel: orderMeta.orderLabel ?? '',
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

  throw new Error('Could not assign a unique cart number for this branch');
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
    branchId: cart.branchId,
    status: cart.status,
    itemCount: cart.items.length,
    totalAmount: Number(cart.totalPrice.toFixed(2)),
    orderType: cart.orderType ?? null,
    tableId: cart.tableId ?? null,
    orderLabel: cart.orderLabel ?? '',
    source: cart.source ?? 'pos',
    customerPhone: cart.customerPhone ?? '',
    customerName: cart.customerName ?? '',
    customerTableNumber: cart.customerTableNumber ?? '',
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

function normalizeOrderType(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!CART_ORDER_TYPES.includes(normalized)) {
    return {
      error: `orderType must be one of: ${CART_ORDER_TYPES.join(', ')}`,
    };
  }
  return normalized;
}

async function validateTableForDineIn({ shopId, branchId, tableId, excludeSessionId = null }) {
  if (!mongoose.Types.ObjectId.isValid(tableId)) {
    return { error: 'Invalid table id', status: 400 };
  }

  const table = await ShopTable.findOne({
    _id: tableId,
    shopId,
    branchId,
    isActive: true,
  }).lean();

  if (!table) {
    return { error: 'Table not found for this branch', status: 404 };
  }

  const occupiedFilter = {
    shopId,
    branchId,
    orderType: 'dine_in',
    tableId: table._id,
    status: { $in: OPEN_TABLE_CART_STATUSES },
  };

  if (excludeSessionId) {
    occupiedFilter.sessionId = { $ne: excludeSessionId };
  }

  const occupied = await Cart.findOne(occupiedFilter).select('sessionId cartNumber').lean();
  if (occupied) {
    return {
      error: `Table ${table.tableNumber} already has an open order (Cart #${occupied.cartNumber})`,
      status: 409,
    };
  }

  return {
    table,
    orderLabel: table.tableNumber,
  };
}

async function resolveCartOrderMeta({ shopId, branchId, orderTypeRaw, tableIdRaw, orderLabelRaw }) {
  const orderType = normalizeOrderType(orderTypeRaw);
  if (orderType && typeof orderType === 'object' && orderType.error) {
    return { error: orderType.error, status: 400 };
  }

  if (!orderType) {
    return { orderType: null, tableId: null, orderLabel: '' };
  }

  if (orderType === 'takeaway') {
    return {
      orderType,
      tableId: null,
      orderLabel: orderLabelRaw == null ? 'Takeaway' : String(orderLabelRaw).trim() || 'Takeaway',
    };
  }

  if (orderType === 'delivery') {
    return {
      orderType,
      tableId: null,
      orderLabel: orderLabelRaw == null ? 'Delivery' : String(orderLabelRaw).trim() || 'Delivery',
    };
  }

  if (!tableIdRaw) {
    return { error: 'tableId is required for dine-in orders', status: 400 };
  }

  const tableResult = await validateTableForDineIn({ shopId, branchId, tableId: tableIdRaw });
  if (tableResult.error) {
    return tableResult;
  }

  return {
    orderType,
    tableId: tableResult.table._id,
    orderLabel:
      orderLabelRaw == null
        ? tableResult.orderLabel
        : String(orderLabelRaw).trim() || tableResult.orderLabel,
  };
}

async function flattenCartItems(carts, shopId) {
  const normalizedShopId = normalizeShopId(shopId);
  if (!normalizedShopId || !Array.isArray(carts) || carts.length === 0) {
    return [];
  }

  for (const cart of carts) {
    if (normalizeShopId(cart.shopId) !== normalizedShopId) {
      throw new Error('Cart data shop mismatch');
    }
  }

  const productIds = carts.flatMap((cart) => cart.items.map((item) => item.productId));
  const productMap = await buildProductDetailsMap(productIds, normalizedShopId);

  return carts.flatMap((cart) =>
    cart.items.map((item) => {
      const product = productMap.get(String(item.productId));
      const unitPrice = getItemUnitPrice(item, product);
      return {
        _id: `${cart._id}:${item.productId}`,
        user: cart.user,
        shopId: cart.shopId,
        branchId: cart.branchId,
        sessionId: cart.sessionId,
        cartNumber: cart.cartNumber,
        product: item.productId,
        productName: item.name,
        productNumber: item.productNumber ?? null,
        quantity: item.quantity,
        kitchenSentQuantity: Number(item.kitchenSentQuantity ?? 0),
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
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const orderMetaResult = await resolveCartOrderMeta({
      shopId,
      branchId,
      orderTypeRaw: req.body?.orderType,
      tableIdRaw: req.body?.tableId,
      orderLabelRaw: req.body?.orderLabel,
    });

    if (orderMetaResult.error) {
      return res.status(orderMetaResult.status ?? 400).json({
        success: false,
        message: orderMetaResult.error,
      });
    }

    const sessionId = new mongoose.Types.ObjectId();

    const cart = await createPendingCart({
      shopId,
      branchId,
      userId: req.user.id,
      sessionId,
      orderMeta: orderMetaResult,
    });

    res.status(201).json({
      success: true,
      sessionId: cart.sessionId,
      cartNumber: cart.cartNumber,
      shopId: cart.shopId,
      branchId: cart.branchId,
      status: cart.status,
      orderType: cart.orderType ?? null,
      tableId: cart.tableId ?? null,
      orderLabel: cart.orderLabel ?? '',
      message: 'Pending cart created',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This cart number already exists for this branch. Please retry.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCartSessions = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const statusRaw = req.query?.status;
    const statusFilter =
      statusRaw === undefined || statusRaw === null
        ? null
        : String(statusRaw).trim().toLowerCase();

    if (statusFilter && !POS_CART_STATUSES.includes(statusFilter)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${POS_CART_STATUSES.join(', ')}`,
      });
    }

    const filter = buildShopCartFilter(shopId, branchId, req.user.id);
    if (statusFilter) {
      filter.status = statusFilter;
    }

    const carts = await Cart.find(filter).sort({ cartNumber: 1 });

    res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: carts.map(mapCartSessionSummary),
      message: 'Cart sessions loaded',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCartItems = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { sessionId } = req.query;
    const statusRaw = req.query?.status;
    const statusFilter =
      statusRaw === undefined || statusRaw === null
        ? null
        : String(statusRaw).trim().toLowerCase();

    const filter = buildShopCartFilter(shopId, branchId, req.user.id);

    if (sessionId !== undefined && sessionId !== null && sessionId !== '') {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ success: false, message: 'Invalid session id' });
      }
      filter.sessionId = sessionId;
    }

    if (statusFilter) {
      if (!POS_CART_STATUSES.includes(statusFilter)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${POS_CART_STATUSES.join(', ')}`,
        });
      }
      filter.status = statusFilter;
    }

    const carts = await Cart.find(filter).sort({ cartNumber: 1 });
    const items = await flattenCartItems(carts, shopId);

    res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: items,
      message: 'Cart items loaded',
    });
  } catch (error) {
    if (error.message === 'Cart data shop mismatch') {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Add or update a product line on an existing cart (cart must be created first). */
const addCartItem = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

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

    const cart = await Cart.findOne(
      buildShopCartFilter(shopId, branchId, req.user.id, { sessionId }),
    );
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found. Create a pending cart first.',
      });
    }

    assertCartAccess(cart, shopId, branchId, req.user.id);

    if (cart.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Items can only be added to pending carts',
      });
    }

    const product = await Product.findOne({ _id: productId, shopId: normalizeShopId(shopId) }).lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found for this shop',
      });
    }

    const productName = product.productName;
    const productNumber = product.productNumber ?? null;
    const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId));
    let isUpdate = false;

    if (itemIndex >= 0) {
      cart.items[itemIndex].name = productName;
      cart.items[itemIndex].productNumber = productNumber;
      cart.items[itemIndex].quantity = qty;
      cart.items[itemIndex].unitCost = null;
      isUpdate = true;
    } else {
      cart.items.push({
        productId,
        productNumber,
        name: productName,
        quantity: qty,
        unitCost: null,
      });
    }

    cart.totalPrice = await calculateCartTotalPrice(cart.items, shopId);
    await cart.save();

    const [flattenedItem] = await flattenCartItems([cart], shopId);
    const responseItem =
      flattenedItem && String(flattenedItem.product) === String(productId)
        ? flattenedItem
        : {
            _id: `${cart._id}:${productId}`,
            user: cart.user,
            shopId: cart.shopId,
            branchId: cart.branchId,
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
      branchId: cart.branchId,
      status: cart.status,
      data: responseItem,
      message: isUpdate ? 'Cart item updated' : 'Cart item added',
    });
  } catch (error) {
    if (
      error.message === 'Cart session not found for this shop' ||
      error.message === 'Cart session not found for this branch' ||
      error.message === 'Cart session not found for this user' ||
      error.message === 'Cart data shop mismatch'
    ) {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCartSessionStatus = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const statusRaw = req.body?.status;
    if (statusRaw === undefined || statusRaw === null || String(statusRaw).trim() === '') {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const statusNormalized = String(statusRaw).trim().toLowerCase();
    if (!POS_CART_STATUSES.includes(statusNormalized)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${POS_CART_STATUSES.join(', ')}`,
      });
    }

    if (statusNormalized === 'proceed') {
      return res.status(400).json({
        success: false,
        message: 'Use POST /api/cart/sessions/:sessionId/checkout to proceed with checkout',
      });
    }

    const cart = await Cart.findOne(
      buildShopCartFilter(shopId, branchId, req.user.id, { sessionId }),
    );

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    cart.status = statusNormalized;
    await cart.save();

    const items = await flattenCartItems([cart], shopId);

    res.status(200).json({
      success: true,
      sessionId,
      cartNumber: cart.cartNumber,
      branchId: cart.branchId,
      status: cart.status,
      data: items,
      message: 'Cart session status updated',
    });
  } catch (error) {
    if (
      error.message === 'Cart session not found for this shop' ||
      error.message === 'Cart session not found for this branch' ||
      error.message === 'Cart session not found for this user' ||
      error.message === 'Cart data shop mismatch'
    ) {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Dine-in only: create a KOT batch for unsent items; cart stays pending. */
const sendCartSessionToKitchen = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const kitchenEnabled = await shopHasKitchenOrders(shopId);
    if (!kitchenEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Kitchen orders are not enabled for this shop',
        code: 'KITCHEN_NOT_ENABLED',
      });
    }

    const cart = await Cart.findOne(
      buildShopCartFilter(shopId, branchId, req.user.id, { sessionId, status: 'pending' }),
    );

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Pending cart session not found',
      });
    }

    if (cart.orderType !== 'dine_in') {
      return res.status(400).json({
        success: false,
        message: 'Send to kitchen is only available for dine-in orders. Takeaway orders go to kitchen after payment.',
        code: 'KITCHEN_SEND_DINE_IN_ONLY',
      });
    }

    if (!Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart has no items to send' });
    }

    const kitchenTicket = await createKitchenTicketsFromCart(cart, req.user.id);
    if (!kitchenTicket) {
      return res.status(400).json({
        success: false,
        message: 'Nothing new to send to kitchen',
        code: 'KITCHEN_NOTHING_TO_SEND',
      });
    }

    const items = await flattenCartItems([cart], shopId);

    res.status(200).json({
      success: true,
      sessionId,
      cartNumber: cart.cartNumber,
      branchId: cart.branchId,
      status: cart.status,
      orderType: cart.orderType ?? null,
      kitchenTicket: mapKitchenTicket(kitchenTicket),
      data: items,
      message: 'Order sent to kitchen',
    });
  } catch (error) {
    if (
      error.message === 'Cart session not found for this shop' ||
      error.message === 'Cart session not found for this branch' ||
      error.message === 'Cart session not found for this user' ||
      error.message === 'Cart data shop mismatch'
    ) {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Checkout added cart: finalize unit costs, discount flags, and set status to proceed. */
const checkoutCartSession = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const cart = await Cart.findOne(
      buildShopCartFilter(shopId, branchId, req.user.id, { sessionId, status: 'added' }),
    );

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Added cart session not found',
      });
    }

    const orderType = cart.orderType ?? null;

    await proceedCartSession(cart, {
      shopId,
      branchId,
      userId: req.user.id,
      discount: req.body?.discount,
      isDiscount: req.body?.isDiscount,
      itemUnitCosts: req.body?.itemUnitCosts,
    });

    let kitchenTicket = null;
    const kitchenEnabled = await shopHasKitchenOrders(shopId);

    if (kitchenEnabled && (orderType === 'takeaway' || orderType === 'delivery')) {
      kitchenTicket = await createKitchenTicketsFromCart(cart, req.user.id);
    } else if (kitchenEnabled && orderType === 'dine_in') {
      await completeKitchenTicketsForSession(shopId, branchId, sessionId);
    }

    const items = await flattenCartItems([cart], shopId);

    res.status(200).json({
      success: true,
      sessionId: cart.sessionId,
      cartNumber: cart.cartNumber,
      branchId: cart.branchId,
      status: cart.status,
      orderType,
      isDiscount: cart.isDiscount,
      isDiscountPercentage: cart.isDiscountPercentage,
      isDiscountAmount: cart.isDiscountAmount,
      discount: cart.discount,
      discountedAmount: cart.discountedAmount,
      taxAmount: cart.taxAmount ?? 0,
      serviceChargeAmount: cart.serviceChargeAmount ?? 0,
      taxBreakdown: cart.taxBreakdown ?? [],
      serviceChargeBreakdown: cart.serviceChargeBreakdown ?? [],
      grandTotal: cart.grandTotal ?? cart.totalPrice,
      totalPrice: cart.totalPrice,
      kitchenTicket: kitchenTicket ? mapKitchenTicket(kitchenTicket) : null,
      data: items,
      message: kitchenTicket ? 'Payment received — order sent to kitchen' : 'Cart checked out',
    });
  } catch (error) {
    if (isCheckoutClientError(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (
      error.message === 'Cart session not found for this shop' ||
      error.message === 'Cart session not found for this branch' ||
      error.message === 'Cart session not found for this user' ||
      error.message === 'Cart data shop mismatch'
    ) {
      return res.status(403).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCartSessionItem = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

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

    const cart = await Cart.findOne(
      buildShopCartFilter(shopId, branchId, req.user.id, { sessionId }),
    );
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    assertCartAccess(cart, shopId, branchId, req.user.id);

    const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId));
    if (itemIndex < 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    assertQuantityNotBelowKitchenSent(cart.items[itemIndex], qty);

    const product = await Product.findOne({ _id: productId, shopId: normalizeShopId(shopId) }).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found for this shop' });
    }

    cart.items[itemIndex].quantity = qty;
    cart.items[itemIndex].name = product.productName;
    cart.items[itemIndex].unitCost = null;
    cart.totalPrice = await calculateCartTotalPrice(cart.items, shopId);
    await cart.save();

    const items = await flattenCartItems([cart], shopId);

    res.status(200).json({
      success: true,
      sessionId,
      cartNumber: cart.cartNumber,
      branchId: cart.branchId,
      totalPrice: cart.totalPrice,
      data: items,
      message: 'Cart item updated',
    });
  } catch (error) {
    if (error.code === 'KITCHEN_QTY_LOCKED') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'KITCHEN_QTY_LOCKED',
      });
    }
    if (
      error.message === 'Cart session not found for this shop' ||
      error.message === 'Cart session not found for this branch' ||
      error.message === 'Cart session not found for this user' ||
      error.message === 'Cart data shop mismatch'
    ) {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

async function removeItemFromCart(cart, productId, shopId, branchId, userId) {
  assertCartAccess(cart, shopId, branchId, userId);

  const itemToRemove = cart.items.find((item) => String(item.productId) === String(productId));
  if (!itemToRemove) {
    return { found: false };
  }

  assertQuantityNotBelowKitchenSent(itemToRemove, 0);

  const nextItems = cart.items.filter((item) => String(item.productId) !== String(productId));

  if (nextItems.length === 0) {
    const deleted = await Cart.findOneAndDelete(
      buildShopCartFilter(shopId, branchId, userId, { sessionId: cart.sessionId }),
    );
    if (!deleted) {
      return { found: false };
    }

    await deleteKitchenTicketsForSession(shopId, branchId, cart.sessionId);

    return {
      found: true,
      sessionId: cart.sessionId,
      cartNumber: cart.cartNumber,
      branchId: cart.branchId,
      cartDeleted: true,
      totalPrice: 0,
      data: [],
      message: 'Cart session deleted',
    };
  }

  cart.items = nextItems;
  cart.totalPrice = await calculateCartTotalPrice(cart.items, shopId);
  await cart.save();

  const items = await flattenCartItems([cart], shopId);

  return {
    found: true,
    sessionId: cart.sessionId,
    cartNumber: cart.cartNumber,
    branchId: cart.branchId,
    cartDeleted: false,
    totalPrice: cart.totalPrice,
    data: items,
    message: 'Cart item removed',
  };
}

const removeCartSessionItem = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { sessionId, productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Valid product id is required' });
    }

    const cart = await Cart.findOne(
      buildShopCartFilter(shopId, branchId, req.user.id, { sessionId }),
    );
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    const result = await removeItemFromCart(cart, productId, shopId, branchId, req.user.id);
    if (!result.found) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.status(200).json({
      success: true,
      sessionId: result.sessionId,
      cartNumber: result.cartNumber,
      branchId: result.branchId,
      cartDeleted: result.cartDeleted,
      totalPrice: result.totalPrice,
      data: result.data,
      message: result.message,
    });
  } catch (error) {
    if (error.code === 'KITCHEN_QTY_LOCKED') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'KITCHEN_QTY_LOCKED',
      });
    }
    if (
      error.message === 'Cart session not found for this shop' ||
      error.message === 'Cart session not found for this branch' ||
      error.message === 'Cart session not found for this user' ||
      error.message === 'Cart data shop mismatch'
    ) {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Branch-wide session detail for table monitoring (not scoped to cart owner). */
const getCartSessionDetail = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const cart = await Cart.findOne({
      shopId: normalizeShopId(shopId),
      branchId: normalizeBranchId(branchId),
      sessionId,
      status: { $in: OPEN_TABLE_CART_STATUSES },
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'No active order found' });
    }

    const items = await flattenCartItems([cart], shopId);

    res.status(200).json({
      success: true,
      data: {
        session: mapCartSessionSummary(cart),
        items,
      },
      message: 'Cart session loaded',
    });
  } catch (error) {
    if (error.message === 'Cart data shop mismatch') {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCartSessionTable = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { sessionId } = req.params;
    const { tableId } = req.body ?? {};

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    if (!tableId || !mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({ success: false, message: 'Valid table id is required' });
    }

    const cart = await Cart.findOne({
      shopId: normalizeShopId(shopId),
      branchId: normalizeBranchId(branchId),
      sessionId,
      status: { $in: OPEN_TABLE_CART_STATUSES },
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'No active order found' });
    }

    if (cart.orderType !== 'dine_in') {
      return res.status(400).json({
        success: false,
        message: 'Only dine-in orders can change table',
      });
    }

    if (String(cart.tableId) === String(tableId)) {
      return res.status(400).json({
        success: false,
        message: 'Order is already assigned to this table',
      });
    }

    const previousTableNumber = cart.orderLabel || '';

    const tableResult = await validateTableForDineIn({
      shopId,
      branchId,
      tableId,
      excludeSessionId: sessionId,
    });

    if (tableResult.error) {
      return res.status(tableResult.status || 400).json({
        success: false,
        message: tableResult.error,
      });
    }

    cart.tableId = tableResult.table._id;
    cart.orderLabel = tableResult.orderLabel;
    await cart.save();

    res.status(200).json({
      success: true,
      data: {
        session: mapCartSessionSummary(cart),
        previousTableNumber,
        newTableNumber: tableResult.orderLabel,
      },
      message: 'Table updated',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCartSession = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const cart = await Cart.findOneAndDelete(
      buildShopCartFilter(shopId, branchId, req.user.id, { sessionId }),
    );

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart session not found' });
    }

    await deleteKitchenTicketsForSession(shopId, branchId, sessionId);

    res.status(200).json({
      success: true,
      sessionId,
      cartNumber: cart.cartNumber,
      branchId: cart.branchId,
      message: 'Cart session deleted',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  mapCartSessionSummary,
  flattenCartItems,
  createCartSession,
  getCartSessions,
  getCartSessionDetail,
  getCartItems,
  addCartItem,
  updateCartSessionStatus,
  updateCartSessionTable,
  sendCartSessionToKitchen,
  checkoutCartSession,
  proceedCartSession,
  updateCartSessionItem,
  removeCartSessionItem,
  deleteCartSession,
  isCheckoutClientError,
};
