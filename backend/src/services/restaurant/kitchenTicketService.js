const ShopsData = require('../../models/shopsData');
const Cart = require('../../models/cart');
const Product = require('../../models/product');
const KitchenTicket = require('../../models/restaurant/kitchenTicket');
const { normalizeIndustryType } = require('../../utils/industryHelper');

const OPEN_KITCHEN_TICKET_STATUSES = KitchenTicket.OPEN_KITCHEN_TICKET_STATUSES;

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function normalizeBranchId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

async function shopHasKitchenOrders(shopId) {
  const normalizedShopId = normalizeShopId(shopId);
  if (!normalizedShopId) return false;

  const shop = await ShopsData.findOne({ shopId: normalizedShopId })
    .select('industryType restaurantModule')
    .lean();

  if (!shop) return false;

  return (
    normalizeIndustryType(shop.industryType) === 'restaurant' &&
    Boolean(shop.restaurantModule?.kitchenOrders)
  );
}

async function getNextTicketNumber(shopId, branchId) {
  const normalizedShopId = normalizeShopId(shopId);
  const normalizedBranchId = normalizeBranchId(branchId);

  const latest = await KitchenTicket.findOne({
    shopId: normalizedShopId,
    branchId: normalizedBranchId,
  })
    .sort({ ticketNumber: -1 })
    .select('ticketNumber')
    .lean();

  return (latest?.ticketNumber ?? 0) + 1;
}

function mapKitchenTicket(ticket) {
  return {
    _id: String(ticket._id),
    shopId: ticket.shopId,
    branchId: ticket.branchId,
    sessionId: String(ticket.sessionId),
    cartNumber: ticket.cartNumber,
    ticketNumber: ticket.ticketNumber,
    orderType: ticket.orderType ?? null,
    orderLabel: ticket.orderLabel ?? '',
    tableId: ticket.tableId ? String(ticket.tableId) : null,
    items: (ticket.items ?? []).map((item) => ({
      productId: String(item.productId),
      name: item.name,
      productNumber: item.productNumber ?? null,
      quantity: item.quantity,
    })),
    status: ticket.status,
    createdBy: ticket.createdBy ? String(ticket.createdBy) : null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function collectDeltaKitchenItems(cartItems) {
  const deltaItems = [];

  for (const item of cartItems ?? []) {
    const sentQty = Number(item.kitchenSentQuantity ?? 0);
    const totalQty = Number(item.quantity ?? 0);
    const deltaQty = totalQty - sentQty;

    if (deltaQty <= 0) continue;

    deltaItems.push({
      productId: item.productId,
      name: item.name,
      productNumber: item.productNumber ?? null,
      quantity: deltaQty,
    });
  }

  return deltaItems;
}

function markCartKitchenItemsSent(cart) {
  for (const item of cart.items ?? []) {
    item.kitchenSentQuantity = Number(item.quantity ?? 0);
  }
}

function roundMoney(value) {
  return Number(Math.max(0, value).toFixed(2));
}

function calculateDiscountedAmount(subtotal, cart) {
  if (!cart?.isDiscount) return 0;

  const discountValue = Number(cart.discount);
  if (!Number.isFinite(discountValue) || discountValue <= 0) return 0;

  if (cart.isDiscountPercentage) {
    return roundMoney(Math.min(subtotal, (subtotal * discountValue) / 100));
  }

  if (cart.isDiscountAmount) {
    return roundMoney(Math.min(subtotal, discountValue));
  }

  return 0;
}

function getProductUnitPrice(product) {
  if (!product) return 0;
  return product.amount == null ? 0 : Number(product.amount);
}

async function calculateCartTotalPriceForItems(items, shopId) {
  const productIds = [...new Set((items ?? []).map((item) => String(item.productId)))];
  if (productIds.length === 0) return 0;

  const products = await Product.find({
    shopId: normalizeShopId(shopId),
    _id: { $in: productIds },
  })
    .select('amount')
    .lean();

  const priceMap = new Map(products.map((product) => [String(product._id), getProductUnitPrice(product)]));

  const total = (items ?? []).reduce((sum, item) => {
    const unitPrice =
      item.unitCost != null && Number.isFinite(Number(item.unitCost))
        ? Number(item.unitCost)
        : priceMap.get(String(item.productId)) ?? 0;
    return sum + unitPrice * Number(item.quantity ?? 0);
  }, 0);

  return roundMoney(total);
}

/**
 * Dine-in only: when an open KOT is cancelled, remove its line quantities from the pending cart.
 */
async function revertKitchenTicketItemsFromPendingCart(ticket) {
  if (!ticket || ticket.orderType !== 'dine_in') {
    return { applied: false, reason: 'not_dine_in' };
  }

  const cart = await Cart.findOne({
    shopId: normalizeShopId(ticket.shopId),
    branchId: normalizeBranchId(ticket.branchId),
    sessionId: ticket.sessionId,
    status: 'pending',
    orderType: 'dine_in',
  });

  if (!cart) {
    return { applied: false, reason: 'cart_not_found' };
  }

  let changed = false;

  for (const kotItem of ticket.items ?? []) {
    const productId = String(kotItem.productId);
    const cartItem = cart.items.find((item) => String(item.productId) === productId);
    if (!cartItem) continue;

    const kotQty = Math.max(0, Number(kotItem.quantity ?? 0));
    if (kotQty <= 0) continue;

    const revertQty = Math.min(kotQty, Number(cartItem.quantity ?? 0));
    if (revertQty <= 0) continue;

    cartItem.quantity = Number(cartItem.quantity) - revertQty;
    cartItem.kitchenSentQuantity = Math.max(
      0,
      Number(cartItem.kitchenSentQuantity ?? 0) - revertQty,
    );
    changed = true;
  }

  if (!changed) {
    return { applied: false, reason: 'no_matching_items' };
  }

  cart.items = cart.items.filter((item) => Number(item.quantity) > 0);

  if (cart.items.length === 0) {
    const sessionId = ticket.sessionId;
    await Cart.findOneAndDelete({ _id: cart._id });
    const kitchenTicketCleanup = await deleteKitchenTicketsForSession(
      ticket.shopId,
      ticket.branchId,
      sessionId,
    );
    return {
      applied: true,
      cartDeleted: true,
      sessionId: String(sessionId),
      cartNumber: ticket.cartNumber,
      kitchenTicketsDeleted: kitchenTicketCleanup.deletedCount,
    };
  }

  cart.totalPrice = await calculateCartTotalPriceForItems(cart.items, cart.shopId);
  cart.discountedAmount = calculateDiscountedAmount(cart.totalPrice, cart);
  await cart.save();

  return {
    applied: true,
    cartDeleted: false,
    sessionId: String(ticket.sessionId),
    cartNumber: ticket.cartNumber,
    itemCount: cart.items.length,
    totalPrice: cart.totalPrice,
  };
}

async function deleteKitchenTicketsForSession(shopId, branchId, sessionId) {
  const normalizedShopId = normalizeShopId(shopId);
  const normalizedBranchId = normalizeBranchId(branchId);

  if (!normalizedShopId || !normalizedBranchId || !sessionId) {
    return { deletedCount: 0 };
  }

  const result = await KitchenTicket.deleteMany({
    shopId: normalizedShopId,
    branchId: normalizedBranchId,
    sessionId,
  });

  return { deletedCount: result.deletedCount ?? 0 };
}

/**
 * Create a KOT for unsent cart lines. Scoped to cart.shopId + cart.branchId (multi-branch safe).
 */
async function createKitchenTicketsFromCart(cart, createdByUserId) {
  if (!cart) return null;

  const enabled = await shopHasKitchenOrders(cart.shopId);
  if (!enabled) return null;

  const deltaItems = collectDeltaKitchenItems(cart.items);
  if (deltaItems.length === 0) return null;

  const ticketNumber = await getNextTicketNumber(cart.shopId, cart.branchId);

  const ticket = await KitchenTicket.create({
    shopId: cart.shopId,
    branchId: cart.branchId,
    sessionId: cart.sessionId,
    cartNumber: cart.cartNumber,
    ticketNumber,
    orderType: cart.orderType ?? null,
    orderLabel: cart.orderLabel ?? '',
    tableId: cart.tableId ?? null,
    items: deltaItems,
    status: 'pending',
    createdBy: createdByUserId,
  });

  markCartKitchenItemsSent(cart);
  await cart.save();

  return ticket;
}

async function completeKitchenTicketsForSession(shopId, branchId, sessionId) {
  const normalizedShopId = normalizeShopId(shopId);
  const normalizedBranchId = normalizeBranchId(branchId);

  await KitchenTicket.updateMany(
    {
      shopId: normalizedShopId,
      branchId: normalizedBranchId,
      sessionId,
      status: { $in: OPEN_KITCHEN_TICKET_STATUSES },
    },
    { $set: { status: 'served' } },
  );
}

module.exports = {
  shopHasKitchenOrders,
  createKitchenTicketsFromCart,
  completeKitchenTicketsForSession,
  revertKitchenTicketItemsFromPendingCart,
  deleteKitchenTicketsForSession,
  mapKitchenTicket,
  OPEN_KITCHEN_TICKET_STATUSES,
};
