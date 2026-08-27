const mongoose = require('mongoose');
const {
  buildCustomerRecommendations,
} = require('../novelty/novelty04RecommendationSystem/recommendationController');
const {
  resolveCustomerOrderContext,
  buildCustomerMenu,
  createCustomerManualOrder,
  listCustomerOrdersForToday,
  sanitizeCustomerPhone,
  isValidCustomerPhone,
} = require('../services/customerOrderService');

/** A cart bigger than this is not a real order, and mining it is pointless. */
const MAX_RECOMMENDATION_CART_LINES = 40;

function sendServiceError(res, error) {
  return res.status(error.status ?? 400).json({
    success: false,
    message: error.message,
    code: error.code,
  });
}

/** Public: branch menu shown after the customer scans the table QR. */
const getCustomerMenu = async (req, res) => {
  try {
    const context = await resolveCustomerOrderContext(req.params.shopId, req.params.branchId);
    if (context.error) {
      return sendServiceError(res, context.error);
    }

    const menu = await buildCustomerMenu(context);

    return res.status(200).json({
      success: true,
      data: menu,
      message: 'Menu loaded',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** Public: customer submits a dine-in order for cashier review. */
const createCustomerOrder = async (req, res) => {
  try {
    const context = await resolveCustomerOrderContext(req.params.shopId, req.params.branchId);
    if (context.error) {
      return sendServiceError(res, context.error);
    }

    const result = await createCustomerManualOrder({
      shop: context.shop,
      branch: context.branch,
      payload: {
        phone: req.body?.phone,
        customerName: req.body?.customerName,
        tableNumber: req.body?.tableNumber,
        items: req.body?.items,
      },
    });

    if (result.error) {
      return sendServiceError(res, result.error);
    }

    const { cart } = result;

    return res.status(201).json({
      success: true,
      data: {
        orderRef: String(cart.sessionId),
        orderNumber: cart.cartNumber,
        status: 'waiting_confirmation',
        tableNumber: cart.customerTableNumber,
        totalAmount: cart.totalPrice,
        placedAt: cart.createdAt,
      },
      message: 'Order sent to the cashier',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** Public: today's orders for one mobile number at this branch. */
const getCustomerOrders = async (req, res) => {
  try {
    const context = await resolveCustomerOrderContext(req.params.shopId, req.params.branchId);
    if (context.error) {
      return sendServiceError(res, context.error);
    }

    const phone = sanitizeCustomerPhone(req.query?.phone);
    if (!isValidCustomerPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Enter the 10-digit mobile number used for the order',
        code: 'PHONE_INVALID',
      });
    }

    const orders = await listCustomerOrdersForToday({
      shop: context.shop,
      branch: context.branch,
      phone,
    });

    return res.status(200).json({
      success: true,
      data: orders,
      message: 'Orders loaded',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * The cart is what the customer is holding right now, not an order being
 * placed, so a bad line is answered with a 400 rather than being tolerated —
 * but nothing in here may reach the catch-all and turn into a 500.
 */
function normalizeRecommendationCart(rawItems) {
  // An empty cart is legitimate: it asks for the shop's popular openers.
  if (rawItems == null) return { productIds: [] };

  if (!Array.isArray(rawItems)) {
    return { error: { status: 400, message: 'items must be an array', code: 'ITEMS_INVALID' } };
  }

  if (rawItems.length > MAX_RECOMMENDATION_CART_LINES) {
    return {
      error: {
        status: 400,
        message: `A cart can hold at most ${MAX_RECOMMENDATION_CART_LINES} different items`,
        code: 'ITEMS_TOO_MANY',
      },
    };
  }

  const productIds = [];
  for (const raw of rawItems) {
    const productId = String(raw?.productId ?? '').trim();
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return {
        error: {
          status: 400,
          message: 'One of the cart items is invalid. Please refresh the menu.',
          code: 'ITEM_INVALID',
        },
      };
    }
    productIds.push(productId);
  }

  return { productIds };
}

/** Public: what else to add to the cart the customer is about to submit. */
const getCustomerOrderRecommendations = async (req, res) => {
  try {
    const context = await resolveCustomerOrderContext(req.params.shopId, req.params.branchId);
    if (context.error) {
      return sendServiceError(res, context.error);
    }

    const cart = normalizeRecommendationCart(req.body?.items);
    if (cart.error) {
      return sendServiceError(res, cart.error);
    }

    // Personalisation is a bonus, not a requirement — an unusable phone number
    // is simply ignored instead of failing the whole request.
    const phone = sanitizeCustomerPhone(req.body?.phone);

    const result = await buildCustomerRecommendations({
      shopId: context.shop.shopId,
      branchId: context.branch.branchId,
      cartProductIds: cart.productIds,
      phone: isValidCustomerPhone(phone) ? phone : '',
      limit: req.body?.limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: result.model.modelReady
        ? 'Recommendations ready'
        : 'Not enough order history to recommend yet',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCustomerMenu,
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderRecommendations,
};
