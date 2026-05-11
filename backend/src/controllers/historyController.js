const mongoose = require('mongoose');
const Cart = require('../models/cart');
const History = require('../models/history');

function mapHistoryRecord(record) {
  const handledUser =
    record.handledUser && typeof record.handledUser === 'object'
      ? {
          _id: record.handledUser._id,
          name: record.handledUser.name,
          email: record.handledUser.email,
        }
      : record.handledUser;

  return {
    _id: record._id,
    handledUser,
    cartSessionId: record.cartSessionId,
    items: record.items,
    totalPrice: Number(record.totalPrice.toFixed(2)),
    checkoutAt: record.checkoutAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

const checkoutCart = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Valid session id is required' });
    }

    const cart = await Cart.findOne({
      user: req.user.id,
      sessionId,
      status: 'added',
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Added cart session not found',
      });
    }

    if (!Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart has no items to checkout',
      });
    }

    const checkoutAt = new Date();
    const history = await History.create({
      handledUser: req.user.id,
      cartSessionId: cart.sessionId,
      items: cart.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
      })),
      totalPrice: cart.totalPrice,
      checkoutAt,
    });

    cart.status = 'proceed';
    await cart.save();

    const populated = await History.findById(history._id).populate('handledUser', 'name email');

    res.status(201).json({
      success: true,
      sessionId,
      status: 'proceed',
      data: mapHistoryRecord(populated),
      message: 'Cart checked out',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function getTodayCheckoutRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function parseStatsDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getStatsDateRange(query) {
  const start = parseStatsDate(query?.from);
  const end = parseStatsDate(query?.to);

  if (start && end && end > start) {
    return { start, end };
  }

  return getTodayCheckoutRange();
}

function mapSalesStats(rows) {
  const row = rows[0];

  return {
    totalSales: Number((row?.totalSales ?? 0).toFixed(2)),
    orderCount: row?.orderCount ?? 0,
  };
}

const getTodayStats = async (req, res) => {
  try {
    const { start, end } = getStatsDateRange(req.query);
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const dateFilter = { checkoutAt: { $gte: start, $lt: end } };

    const [mineRows, allRows] = await Promise.all([
      History.aggregate([
        { $match: { ...dateFilter, handledUser: userId } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalPrice' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      History.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalPrice' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        mine: mapSalesStats(mineRows),
        all: mapSalesStats(allRows),
      },
      message: 'Today sales stats loaded',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const scopeRaw = req.query?.scope;
    const scope =
      scopeRaw === undefined || scopeRaw === null
        ? 'mine'
        : String(scopeRaw).trim().toLowerCase();

    if (scope !== 'mine' && scope !== 'all') {
      return res.status(400).json({
        success: false,
        message: 'Scope must be mine or all',
      });
    }

    const filter = scope === 'all' ? {} : { handledUser: req.user.id };
    const records = await History.find(filter)
      .populate('handledUser', 'name email')
      .sort({ checkoutAt: -1 });

    res.status(200).json({
      success: true,
      scope,
      data: records.map(mapHistoryRecord),
      message: 'History loaded',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  checkoutCart,
  getTodayStats,
  getHistory,
};
