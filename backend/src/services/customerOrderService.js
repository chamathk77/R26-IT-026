const mongoose = require('mongoose');
const Cart = require('../models/cart');
const History = require('../models/history');
const Product = require('../models/product');
const Category = require('../models/category');
const Branch = require('../models/branch');
const BranchStock = require('../models/branchStock');
const ShopsData = require('../models/shopsData');
const ShopTable = require('../models/restaurant/shopTable');
const { getNextCartNumber } = require('./cartNumberService');
const { normalizeIndustryType } = require('../utils/industryHelper');

const MANUAL_CART_STATUS = Cart.MANUAL_CART_STATUS;
const CUSTOMER_ORDER_SOURCE = 'customer_qr';
const BRANCH_ID_PATTERN = Cart.BRANCH_ID_PATTERN;

/** Shops in these states cannot take customer QR orders. */
const BLOCKED_SHOP_STATUSES = ['disabled', 'trialExpired', 'diactiveByAdmin'];

const MAX_ORDER_LINES = 40;
const MAX_LINE_QUANTITY = 99;
/** Guard against a customer spamming the public endpoint from one number. */
const MAX_OPEN_ORDERS_PER_PHONE = 5;
const MAX_TABLE_NUMBER_LENGTH = 20;
const MAX_CUSTOMER_NAME_LENGTH = 60;

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function normalizeBranchId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function roundMoney(value) {
  return Number(Math.max(0, Number(value) || 0).toFixed(2));
}

function sanitizeCustomerPhone(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** Same rule as bill SMS receipts: Sri Lankan 10-digit number starting with 0. */
function isValidCustomerPhone(phone) {
  return /^0\d{9}$/.test(phone);
}

function getProductUnitPrice(product) {
  return product?.amount == null ? 0 : Number(product.amount);
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

/** Public web base URL the branch QR points at (Next.js customer pages). */
function getCustomerOrderWebBaseUrl() {
  const configured =
    process.env.CUSTOMER_ORDER_WEB_BASE_URL?.trim() ||
    process.env.PUBLIC_WEB_BASE_URL?.trim();
  return configured ? configured.replace(/\/$/, '') : '';
}

function buildCustomerOrderUrl(shopId, branchId) {
  const base = getCustomerOrderWebBaseUrl();
  if (!base) return '';
  return `${base}/order/${encodeURIComponent(shopId)}/${encodeURIComponent(branchId)}`;
}

function shopHasTableManagement(shop) {
  return (
    normalizeIndustryType(shop?.industryType) === 'restaurant' &&
    Boolean(shop?.restaurantModule?.tableManagement)
  );
}

/**
 * Validate a public shopId/branchId pair before exposing menu or taking orders.
 * Returns { error } with an HTTP status, or { shop, branch }.
 */
async function resolveCustomerOrderContext(shopIdRaw, branchIdRaw) {
  const shopId = normalizeShopId(shopIdRaw);
  const branchId = normalizeBranchId(branchIdRaw);

  if (!shopId) {
    return { error: { status: 400, message: 'Shop id is required', code: 'SHOP_ID_REQUIRED' } };
  }

  if (!branchId || !BRANCH_ID_PATTERN.test(branchId)) {
    return {
      error: { status: 400, message: 'Valid branch id is required', code: 'BRANCH_ID_INVALID' },
    };
  }

  const [shop, branch] = await Promise.all([
    ShopsData.findOne({ shopId })
      .select(
        'shopId shopName address shopMobileNumber status onboardStep industryType restaurantModule customerManualOrder billingConfig',
      )
      .lean(),
    Branch.findOne({ shopId, branchId }).lean(),
  ]);

  if (!shop) {
    return { error: { status: 404, message: 'Shop not found', code: 'SHOP_NOT_FOUND' } };
  }

  if (shop.onboardStep !== 'completed' || BLOCKED_SHOP_STATUSES.includes(shop.status)) {
    return {
      error: {
        status: 403,
        message: 'This shop is not accepting online orders right now.',
        code: 'SHOP_NOT_ACTIVE',
      },
    };
  }

  if (!shop.customerManualOrder) {
    return {
      error: {
        status: 403,
        message: 'Online ordering is not enabled for this shop.',
        code: 'CUSTOMER_MANUAL_ORDER_DISABLED',
      },
    };
  }

  if (!branch) {
    return { error: { status: 404, message: 'Branch not found', code: 'BRANCH_NOT_FOUND' } };
  }

  if (!branch.isActive) {
    return {
      error: { status: 403, message: 'This branch is closed.', code: 'BRANCH_INACTIVE' },
    };
  }

  return { shop, branch };
}

function mapMenuShop(shop) {
  return {
    shopId: shop.shopId,
    shopName: shop.shopName ?? '',
    address: shop.address ?? '',
    phone: shop.shopMobileNumber ?? '',
  };
}

function mapMenuBranch(branch) {
  return {
    branchId: branch.branchId,
    branchName: branch.branchName ?? '',
    address: branch.address ?? '',
    phone: branch.phone ?? '',
    isMainBranch: Boolean(branch.isMainBranch),
  };
}

/**
 * Branch menu for the customer web page: sellable products only, with branch
 * stock applied so out-of-stock lines can be disabled.
 */
async function buildCustomerMenu({ shop, branch }) {
  const shopId = normalizeShopId(shop.shopId);
  const branchId = normalizeBranchId(branch.branchId);

  const [products, categories, tables] = await Promise.all([
    Product.find({ shopId, type: 'product', amount: { $ne: null, $gt: 0 } })
      .select('productName productNumber categoryId categoryName amount image isInventoryAvailable')
      .sort({ categoryName: 1, productName: 1 })
      .lean(),
    Category.find({ shopId }).select('name colorCode').sort({ name: 1 }).lean(),
    shopHasTableManagement(shop)
      ? ShopTable.find({ shopId, branchId, isActive: true })
          .select('tableNumber tableName zone sortOrder')
          .sort({ sortOrder: 1, tableNumber: 1 })
          .lean()
      : Promise.resolve([]),
  ]);

  const trackedIds = products.filter((p) => p.isInventoryAvailable).map((p) => p._id);
  const stocks = trackedIds.length
    ? await BranchStock.find({ shopId, branchId, productId: { $in: trackedIds } })
        .select('productId qty')
        .lean()
    : [];

  const qtyByProductId = new Map(
    stocks.map((stock) => [String(stock.productId), Number(stock.qty) || 0]),
  );

  const items = products.map((product) => {
    const qty = product.isInventoryAvailable
      ? qtyByProductId.get(String(product._id)) ?? 0
      : null;

    return {
      _id: String(product._id),
      productName: product.productName,
      productNumber: product.productNumber ?? null,
      categoryId: product.categoryId ? String(product.categoryId) : null,
      categoryName: product.categoryName ?? '',
      amount: getProductUnitPrice(product),
      image: product.image ?? '',
      isInventoryAvailable: Boolean(product.isInventoryAvailable),
      qty,
      available: product.isInventoryAvailable ? qty > 0 : true,
    };
  });

  return {
    shop: mapMenuShop(shop),
    branch: mapMenuBranch(branch),
    tableManagement: shopHasTableManagement(shop),
    categories: categories.map((category) => ({
      _id: String(category._id),
      name: category.name,
      colorCode: category.colorCode ?? '',
    })),
    tables: tables.map((table) => ({
      _id: String(table._id),
      tableNumber: table.tableNumber,
      tableName: table.tableName ?? '',
      zone: table.zone ?? '',
    })),
    items,
  };
}

function normalizeOrderLines(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: 'Add at least one item to your order' };
  }

  if (rawItems.length > MAX_ORDER_LINES) {
    return { error: `An order can hold at most ${MAX_ORDER_LINES} different items` };
  }

  const quantityByProductId = new Map();

  for (const raw of rawItems) {
    const productId = String(raw?.productId ?? '').trim();
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return { error: 'One of the selected items is invalid. Please refresh the menu.' };
    }

    const quantity = Number(raw?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { error: 'Quantity must be a whole number of at least 1' };
    }

    const merged = (quantityByProductId.get(productId) ?? 0) + quantity;
    if (merged > MAX_LINE_QUANTITY) {
      return { error: `Quantity per item cannot exceed ${MAX_LINE_QUANTITY}` };
    }

    quantityByProductId.set(productId, merged);
  }

  return { quantityByProductId };
}

/**
 * Match the typed table number to an active ShopTable in this branch.
 * Unmatched numbers are still kept on the cart as free text.
 */
async function findBranchTableByNumber({ shopId, branchId, tableNumber }) {
  if (!tableNumber) return null;

  return ShopTable.findOne({
    shopId,
    branchId,
    tableNumber,
    isActive: true,
  })
    .select('_id tableNumber')
    .lean();
}

/**
 * Create a 'manual' cart from a customer QR submission. Prices always come from
 * the catalog, never from the request body.
 */
async function createCustomerManualOrder({ shop, branch, payload }) {
  const shopId = normalizeShopId(shop.shopId);
  const branchId = normalizeBranchId(branch.branchId);

  const phone = sanitizeCustomerPhone(payload?.phone);
  if (!isValidCustomerPhone(phone)) {
    return { error: { status: 400, message: 'Enter a valid 10-digit mobile number (e.g. 0771234567)' } };
  }

  const tableNumber = String(payload?.tableNumber ?? '').trim();
  if (!tableNumber) {
    return { error: { status: 400, message: 'Table number is required' } };
  }
  if (tableNumber.length > MAX_TABLE_NUMBER_LENGTH) {
    return { error: { status: 400, message: 'Table number is too long' } };
  }

  const customerName = String(payload?.customerName ?? '')
    .trim()
    .slice(0, MAX_CUSTOMER_NAME_LENGTH);

  const lineResult = normalizeOrderLines(payload?.items);
  if (lineResult.error) {
    return { error: { status: 400, message: lineResult.error } };
  }

  const openOrders = await Cart.countDocuments({
    shopId,
    branchId,
    status: MANUAL_CART_STATUS,
    customerPhone: phone,
  });

  if (openOrders >= MAX_OPEN_ORDERS_PER_PHONE) {
    return {
      error: {
        status: 429,
        message:
          'You already have orders waiting for the cashier. Please wait until they are confirmed.',
        code: 'TOO_MANY_OPEN_ORDERS',
      },
    };
  }

  const productIds = [...lineResult.quantityByProductId.keys()];
  const products = await Product.find({
    _id: { $in: productIds },
    shopId,
    type: 'product',
  })
    .select('productName productNumber amount isInventoryAvailable')
    .lean();

  if (products.length !== productIds.length) {
    return {
      error: {
        status: 400,
        message: 'Some items are no longer on the menu. Please refresh and try again.',
        code: 'MENU_CHANGED',
      },
    };
  }

  const productById = new Map(products.map((product) => [String(product._id), product]));

  const trackedIds = products.filter((p) => p.isInventoryAvailable).map((p) => p._id);
  const stocks = trackedIds.length
    ? await BranchStock.find({ shopId, branchId, productId: { $in: trackedIds } })
        .select('productId qty')
        .lean()
    : [];
  const qtyByProductId = new Map(
    stocks.map((stock) => [String(stock.productId), Number(stock.qty) || 0]),
  );

  const items = [];
  let totalPrice = 0;

  for (const [productId, quantity] of lineResult.quantityByProductId.entries()) {
    const product = productById.get(productId);
    const unitPrice = getProductUnitPrice(product);

    if (unitPrice <= 0) {
      return {
        error: {
          status: 400,
          message: `${product.productName} is not available to order online.`,
          code: 'ITEM_NOT_ORDERABLE',
        },
      };
    }

    if (product.isInventoryAvailable) {
      const available = qtyByProductId.get(productId) ?? 0;
      if (quantity > available) {
        return {
          error: {
            status: 409,
            message: `Only ${available} left of ${product.productName}. Please adjust the quantity.`,
            code: 'INSUFFICIENT_STOCK',
          },
        };
      }
    }

    items.push({
      productId,
      name: product.productName,
      productNumber: product.productNumber ?? null,
      quantity,
      // Snapshot the menu price the customer saw; the cashier can still re-price.
      unitCost: unitPrice,
    });

    totalPrice += unitPrice * quantity;
  }

  const table = await findBranchTableByNumber({ shopId, branchId, tableNumber });

  const MAX_ATTEMPTS = 5;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const cartNumber = await getNextCartNumber(shopId, branchId);

    try {
      const cart = await Cart.create({
        shopId,
        branchId,
        user: null,
        sessionId: new mongoose.Types.ObjectId(),
        cartNumber,
        items,
        totalPrice: roundMoney(totalPrice),
        status: MANUAL_CART_STATUS,
        source: CUSTOMER_ORDER_SOURCE,
        customerPhone: phone,
        customerName,
        customerTableNumber: tableNumber,
        orderType: 'dine_in',
        tableId: table?._id ?? null,
        orderLabel: table?.tableNumber ?? tableNumber,
      });

      return { cart };
    } catch (error) {
      lastError = error;
      const isDuplicateCartNumber =
        error.code === 11000 &&
        error.keyPattern &&
        Object.prototype.hasOwnProperty.call(error.keyPattern, 'cartNumber');

      if (!isDuplicateCartNumber) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error('Could not place the order. Please try again.');
}

/** Cashier-facing shape for the manual order review list. */
function mapManualOrderForStaff(cart) {
  return {
    sessionId: String(cart.sessionId),
    cartNumber: cart.cartNumber,
    shopId: cart.shopId,
    branchId: cart.branchId,
    status: cart.status,
    source: cart.source ?? CUSTOMER_ORDER_SOURCE,
    customerPhone: cart.customerPhone ?? '',
    customerName: cart.customerName ?? '',
    tableNumber: cart.customerTableNumber ?? cart.orderLabel ?? '',
    orderType: cart.orderType ?? null,
    orderLabel: cart.orderLabel ?? '',
    tableId: cart.tableId ? String(cart.tableId) : null,
    itemCount: Array.isArray(cart.items) ? cart.items.length : 0,
    totalQuantity: (cart.items ?? []).reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0,
    ),
    totalAmount: roundMoney(cart.totalPrice),
    items: (cart.items ?? []).map((item) => ({
      productId: String(item.productId),
      name: item.name,
      productNumber: item.productNumber ?? null,
      quantity: Number(item.quantity) || 0,
      unitPrice: roundMoney(item.unitCost ?? 0),
      lineTotal: roundMoney((Number(item.unitCost) || 0) * (Number(item.quantity) || 0)),
    })),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

async function listManualOrdersForBranch(shopId, branchId) {
  const carts = await Cart.find({
    shopId: normalizeShopId(shopId),
    branchId: normalizeBranchId(branchId),
    status: MANUAL_CART_STATUS,
  })
    .sort({ createdAt: 1 })
    .lean();

  return carts.map(mapManualOrderForStaff);
}

async function countManualOrdersForBranch(shopId, branchId) {
  return Cart.countDocuments({
    shopId: normalizeShopId(shopId),
    branchId: normalizeBranchId(branchId),
    status: MANUAL_CART_STATUS,
  });
}

/**
 * Hand a reviewed manual order to the cashier: the cart becomes a normal
 * pending POS cart owned by that user and continues through the usual flow.
 */
async function acceptManualOrder({ shopId, branchId, sessionId, userId }) {
  const normalizedShopId = normalizeShopId(shopId);
  const normalizedBranchId = normalizeBranchId(branchId);

  const cart = await Cart.findOne({
    shopId: normalizedShopId,
    branchId: normalizedBranchId,
    sessionId,
    status: MANUAL_CART_STATUS,
  });

  if (!cart) {
    return { error: { status: 404, message: 'Manual order not found', code: 'MANUAL_ORDER_NOT_FOUND' } };
  }

  if (!Array.isArray(cart.items) || cart.items.length === 0) {
    return { error: { status: 400, message: 'This manual order has no items', code: 'MANUAL_ORDER_EMPTY' } };
  }

  const tableNumber = cart.customerTableNumber || cart.orderLabel || '';
  const table = await findBranchTableByNumber({
    shopId: normalizedShopId,
    branchId: normalizedBranchId,
    tableNumber,
  });

  let tableWarning = null;
  let resolvedTableId = null;

  if (table) {
    // Only one open dine-in cart may hold a table at a time.
    const occupied = await Cart.findOne({
      shopId: normalizedShopId,
      branchId: normalizedBranchId,
      orderType: 'dine_in',
      tableId: table._id,
      status: { $in: Cart.OPEN_TABLE_CART_STATUSES },
    })
      .select('cartNumber')
      .lean();

    if (occupied) {
      tableWarning = `Table ${table.tableNumber} already has an open order (Cart #${occupied.cartNumber}). Accepted without linking the table.`;
    } else {
      resolvedTableId = table._id;
    }
  } else if (tableNumber) {
    tableWarning = `Table ${tableNumber} is not set up in this branch. Accepted without linking a table.`;
  }

  cart.user = userId;
  cart.status = 'pending';
  cart.tableId = resolvedTableId;
  cart.orderLabel = table?.tableNumber ?? tableNumber;
  cart.acceptedBy = userId;
  cart.acceptedAt = new Date();
  await cart.save();

  return { cart, tableWarning };
}

async function rejectManualOrder({ shopId, branchId, sessionId }) {
  const cart = await Cart.findOneAndDelete({
    shopId: normalizeShopId(shopId),
    branchId: normalizeBranchId(branchId),
    sessionId,
    status: MANUAL_CART_STATUS,
  });

  if (!cart) {
    return { error: { status: 404, message: 'Manual order not found', code: 'MANUAL_ORDER_NOT_FOUND' } };
  }

  return { cart };
}

/** Customer-visible order state (never leaks POS internals). */
function toCustomerOrderStatus(cartStatus) {
  if (cartStatus === MANUAL_CART_STATUS) return 'waiting_confirmation';
  if (cartStatus === 'pending' || cartStatus === 'added') return 'confirmed';
  return 'billed';
}

function mapCustomerOrderFromCart(cart) {
  return {
    orderRef: String(cart.sessionId),
    orderNumber: cart.cartNumber,
    status: toCustomerOrderStatus(cart.status),
    tableNumber: cart.customerTableNumber || cart.orderLabel || '',
    totalAmount: roundMoney(cart.totalPrice),
    items: (cart.items ?? []).map((item) => ({
      name: item.name,
      quantity: Number(item.quantity) || 0,
      unitPrice: roundMoney(item.unitCost ?? 0),
      lineTotal: roundMoney((Number(item.unitCost) || 0) * (Number(item.quantity) || 0)),
    })),
    placedAt: cart.createdAt,
    paid: false,
  };
}

function mapCustomerOrderFromHistory(record) {
  return {
    orderRef: String(record.cartId),
    orderNumber: record.cartNumber,
    status: 'paid',
    tableNumber: record.orderLabel ?? '',
    totalAmount: roundMoney(record.totalAmount),
    items: (record.items ?? []).map((item) => ({
      name: item.productName,
      quantity: Number(item.qty) || 0,
      unitPrice: roundMoney(item.unitCost ?? 0),
      lineTotal: roundMoney((Number(item.unitCost) || 0) * (Number(item.qty) || 0)),
    })),
    placedAt: record.checkOutTime,
    paid: true,
  };
}

/**
 * Today's orders for one mobile number at one branch — dine-in customers
 * checking what they already ordered.
 */
async function listCustomerOrdersForToday({ shop, branch, phone }) {
  const shopId = normalizeShopId(shop.shopId);
  const branchId = normalizeBranchId(branch.branchId);
  const { start, end } = getTodayRange();

  const [carts, historyRecords] = await Promise.all([
    Cart.find({
      shopId,
      branchId,
      customerPhone: phone,
      source: CUSTOMER_ORDER_SOURCE,
      createdAt: { $gte: start, $lt: end },
    })
      .sort({ createdAt: -1 })
      .lean(),
    History.find({
      shopId,
      branchId,
      customerMobile: phone,
      checkOutTime: { $gte: start, $lt: end },
    })
      .sort({ checkOutTime: -1 })
      .lean(),
  ]);

  // A cart that reached history is shown from the paid record only.
  const billedCartIds = new Set(historyRecords.map((record) => String(record.cartId)));

  const orders = [
    ...carts
      .filter((cart) => !billedCartIds.has(String(cart.sessionId)))
      .map(mapCustomerOrderFromCart),
    ...historyRecords.map(mapCustomerOrderFromHistory),
  ].sort((left, right) => new Date(right.placedAt) - new Date(left.placedAt));

  return orders;
}

function buildBranchOrderQrPayload({ shop, branch }) {
  const orderUrl = buildCustomerOrderUrl(shop.shopId, branch.branchId);

  return {
    shopId: shop.shopId,
    shopName: shop.shopName ?? '',
    branchId: branch.branchId,
    branchName: branch.branchName ?? '',
    orderUrl,
    configured: Boolean(orderUrl),
  };
}

module.exports = {
  MANUAL_CART_STATUS,
  CUSTOMER_ORDER_SOURCE,
  MAX_OPEN_ORDERS_PER_PHONE,
  sanitizeCustomerPhone,
  isValidCustomerPhone,
  resolveCustomerOrderContext,
  buildCustomerMenu,
  createCustomerManualOrder,
  mapManualOrderForStaff,
  listManualOrdersForBranch,
  countManualOrdersForBranch,
  acceptManualOrder,
  rejectManualOrder,
  listCustomerOrdersForToday,
  buildBranchOrderQrPayload,
  buildCustomerOrderUrl,
  getCustomerOrderWebBaseUrl,
};
