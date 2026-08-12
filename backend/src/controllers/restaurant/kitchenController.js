const mongoose = require('mongoose');
const KitchenTicket = require('../../models/restaurant/kitchenTicket');
const {
  shopHasKitchenOrders,
  mapKitchenTicket,
  OPEN_KITCHEN_TICKET_STATUSES,
  revertKitchenTicketItemsFromPendingCart,
} = require('../../services/restaurant/kitchenTicketService');

const KITCHEN_TICKET_STATUSES = KitchenTicket.KITCHEN_TICKET_STATUSES;

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function normalizeBranchId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

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

function parseStatusFilter(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return OPEN_KITCHEN_TICKET_STATUSES;
  }

  const values = String(raw)
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const invalid = values.filter((value) => !KITCHEN_TICKET_STATUSES.includes(value));
  if (invalid.length) {
    return {
      error: `Invalid status filter: ${invalid.join(', ')}`,
    };
  }

  return values;
}

const getKitchenTickets = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const kitchenEnabled = await shopHasKitchenOrders(shopId);
    if (!kitchenEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Kitchen orders are not enabled for this shop',
        code: 'KITCHEN_NOT_ENABLED',
      });
    }

    const statusFilter = parseStatusFilter(req.query?.status);
    if (statusFilter.error) {
      return res.status(400).json({ success: false, message: statusFilter.error });
    }

    const limitRaw = req.query?.limit;
    const limit =
      limitRaw === undefined || limitRaw === null || String(limitRaw).trim() === ''
        ? null
        : Number(limitRaw);
    if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
      return res.status(400).json({
        success: false,
        message: 'limit must be an integer between 1 and 100',
      });
    }

    let query = KitchenTicket.find({
      shopId,
      branchId,
      status: { $in: statusFilter },
    }).sort({ updatedAt: -1, createdAt: -1 });

    if (limit !== null) {
      query = query.limit(limit);
    }

    const tickets = await query.lean();

    res.status(200).json({
      success: true,
      shopId,
      branchId,
      count: tickets.length,
      data: tickets.map(mapKitchenTicket),
      message: 'Kitchen tickets loaded',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateKitchenTicketStatus = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const kitchenEnabled = await shopHasKitchenOrders(shopId);
    if (!kitchenEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Kitchen orders are not enabled for this shop',
        code: 'KITCHEN_NOT_ENABLED',
      });
    }

    const { ticketId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket id' });
    }

    const nextStatus = String(req.body?.status ?? '')
      .trim()
      .toLowerCase();
    if (!KITCHEN_TICKET_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${KITCHEN_TICKET_STATUSES.join(', ')}`,
      });
    }

    const existing = await KitchenTicket.findOne({
      _id: ticketId,
      shopId,
      branchId,
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Kitchen ticket not found' });
    }

    if (nextStatus === 'cancelled' && !OPEN_KITCHEN_TICKET_STATUSES.includes(existing.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only open kitchen tickets can be cancelled',
        code: 'KITCHEN_CANCEL_NOT_ALLOWED',
      });
    }

    let cartSync = null;
    if (nextStatus === 'cancelled') {
      cartSync = await revertKitchenTicketItemsFromPendingCart(existing);
    }

    if (nextStatus === 'cancelled' && cartSync?.cartDeleted) {
      return res.status(200).json({
        success: true,
        data: mapKitchenTicket({ ...existing.toObject(), status: 'cancelled' }),
        cartSync,
        message: 'Kitchen ticket cancelled',
      });
    }

    const ticket = await KitchenTicket.findOneAndUpdate(
      {
        _id: ticketId,
        shopId,
        branchId,
      },
      { $set: { status: nextStatus } },
      { returnDocument: 'after', runValidators: true },
    );

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Kitchen ticket not found' });
    }

    res.status(200).json({
      success: true,
      data: mapKitchenTicket(ticket),
      cartSync,
      message: 'Kitchen ticket updated',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getKitchenTickets,
  updateKitchenTicketStatus,
};
