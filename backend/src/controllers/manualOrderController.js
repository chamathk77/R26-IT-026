const mongoose = require('mongoose');
const Branch = require('../models/branch');
const ShopsData = require('../models/shopsData');
const { mapCartSessionSummary } = require('./cartController');
const {
  listManualOrdersForBranch,
  countManualOrdersForBranch,
  acceptManualOrder,
  rejectManualOrder,
  buildBranchOrderQrPayload,
} = require('../services/customerOrderService');

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function normalizeBranchId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

/** Manual orders are always scoped to the branch in the caller's token. */
function requireShopAndBranchId(req, res) {
  const shopId = normalizeShopId(req.user?.shopId);
  if (!shopId) {
    res.status(400).json({ success: false, message: 'Shop id is required' });
    return null;
  }

  const branchId = normalizeBranchId(req.user?.branchId);
  if (!branchId) {
    res.status(400).json({ success: false, message: 'Branch id is required' });
    return null;
  }

  return { shopId, branchId };
}

function sendServiceError(res, error) {
  return res.status(error.status ?? 400).json({
    success: false,
    message: error.message,
    code: error.code,
  });
}

/** Cashier queue: customer QR orders waiting for review in this branch. */
const getManualOrders = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const orders = await listManualOrdersForBranch(shopId, branchId);

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      count: orders.length,
      data: orders,
      message: 'Manual orders loaded',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** Badge count for the home screen button. */
const getManualOrderCount = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const count = await countManualOrdersForBranch(shopId, branchId);

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: { count },
      message: 'Manual order count loaded',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** QR payload for the logged-in branch (rendered as a QR code in the app). */
const getBranchOrderQr = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const [shop, branch] = await Promise.all([
      ShopsData.findOne({ shopId })
        .select('shopId shopName customerManualOrder')
        .lean(),
      Branch.findOne({ shopId, branchId }).select('branchId branchName').lean(),
    ]);

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    if (!shop.customerManualOrder) {
      return res.status(403).json({
        success: false,
        message: 'Customer manual order is not enabled for this shop.',
        code: 'CUSTOMER_MANUAL_ORDER_DISABLED',
      });
    }

    const payload = buildBranchOrderQrPayload({ shop, branch });

    if (!payload.configured) {
      return res.status(503).json({
        success: false,
        message:
          'Customer order web address is not configured on the server (CUSTOMER_ORDER_WEB_BASE_URL).',
        code: 'CUSTOMER_ORDER_URL_NOT_CONFIGURED',
      });
    }

    return res.status(200).json({
      success: true,
      data: payload,
      message: 'Branch order QR loaded',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** Approve a manual order — it becomes this cashier's pending POS cart. */
const acceptManualOrderSession = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const result = await acceptManualOrder({
      shopId,
      branchId,
      sessionId,
      userId: req.user.id,
    });

    if (result.error) {
      return sendServiceError(res, result.error);
    }

    return res.status(200).json({
      success: true,
      data: {
        session: mapCartSessionSummary(result.cart),
        tableWarning: result.tableWarning ?? null,
      },
      message: 'Manual order moved to your pending carts',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This order could not be accepted. Please refresh and try again.',
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** Discard a manual order the cashier does not want to take. */
const rejectManualOrderSession = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const result = await rejectManualOrder({ shopId, branchId, sessionId });
    if (result.error) {
      return sendServiceError(res, result.error);
    }

    return res.status(200).json({
      success: true,
      data: { sessionId, cartNumber: result.cart.cartNumber },
      message: 'Manual order rejected',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getManualOrders,
  getManualOrderCount,
  getBranchOrderQr,
  acceptManualOrderSession,
  rejectManualOrderSession,
};
