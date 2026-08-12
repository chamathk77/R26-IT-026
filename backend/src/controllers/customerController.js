const Customer = require('../models/customer');
const mongoose = require('mongoose');

const POINTS_PER_ORDER = 10;

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function sanitizeMobile(value) {
  return String(value ?? '').replace(/\D/g, '').trim();
}

function roundMoney(value) {
  return Number(Math.max(0, value).toFixed(2));
}

function normalizeOptionalName(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizePastOrder(value) {
  if (!value || typeof value !== 'object') {
    return { error: 'Past order payload is required' };
  }

  const historyId = value.historyId;
  if (!historyId || !mongoose.Types.ObjectId.isValid(String(historyId))) {
    return { error: 'Valid history id is required for past order' };
  }

  const orderId = String(value.orderId ?? '').trim().toUpperCase();
  if (!orderId) {
    return { error: 'Order id is required for past order' };
  }

  const checkOutTime = value.checkOutTime ? new Date(value.checkOutTime) : null;
  if (!checkOutTime || Number.isNaN(checkOutTime.getTime())) {
    return { error: 'Valid checkout time is required for past order' };
  }

  const amount = roundMoney(value.amount);
  const discountedAmount = roundMoney(value.discountedAmount ?? 0);
  const totalAmount = roundMoney(
    value.totalAmount !== undefined ? value.totalAmount : amount - discountedAmount,
  );

  if (totalAmount <= 0) {
    return { error: 'Valid total amount is required for past order' };
  }

  const items = Array.isArray(value.items)
    ? value.items
        .map((item) => ({
          productId: item?.productId,
          productName: String(item?.productName ?? '').trim(),
          qty: Math.max(1, Math.floor(Number(item?.qty) || 1)),
          unitCost:
            item?.unitCost === undefined || item?.unitCost === null
              ? null
              : roundMoney(item.unitCost),
        }))
        .filter((item) => item.productName)
    : [];

  const pastOrder = {
    historyId,
    orderId,
    checkOutTime,
    amount,
    isDiscount: Boolean(value.isDiscount),
    discountedAmount,
    totalAmount,
    items,
    status: value.status ? String(value.status).trim() : 'submited',
  };

  if (value.cartNumber !== undefined && value.cartNumber !== null) {
    pastOrder.cartNumber = Math.max(1, Math.floor(Number(value.cartNumber)));
  }
  if (value.branchId) {
    pastOrder.branchId = String(value.branchId).trim().toUpperCase();
  }
  if (value.paymentOption) {
    pastOrder.paymentOption = String(value.paymentOption).trim().toLowerCase();
  }

  return { pastOrder };
}

function buildPastOrderSnapshot(historyRecord) {
  if (!historyRecord) {
    return { error: 'History record is required' };
  }

  return normalizePastOrder({
    historyId: historyRecord._id,
    orderId: historyRecord.orderId,
    cartNumber: historyRecord.cartNumber,
    branchId: historyRecord.branchId,
    checkOutTime: historyRecord.checkOutTime,
    amount: historyRecord.amount,
    isDiscount: Boolean(historyRecord.isDiscount),
    discountedAmount: historyRecord.discountedAmount,
    totalAmount: historyRecord.totalAmount,
    paymentOption: historyRecord.paymentOption,
    items: historyRecord.items,
    status: historyRecord.status ?? 'submited',
  });
}

async function manageCustomerData(input, options = {}) {
  const shopId = normalizeShopId(input?.shopId);
  if (!shopId) {
    return { error: 'Shop id is required' };
  }

  const mobileNumber = sanitizeMobile(input?.mobileNumber);
  if (!mobileNumber) {
    return { error: 'Valid mobile number is required' };
  }

  const salesAmount = roundMoney(input?.salesAmount);
  if (salesAmount <= 0) {
    return { error: 'Valid sales amount is required' };
  }

  const name = normalizeOptionalName(input?.name);
  const pastOrderResult = input?.pastOrder
    ? normalizePastOrder(input.pastOrder)
    : { pastOrder: null };
  if (pastOrderResult.error) {
    return { error: pastOrderResult.error };
  }
  const pastOrder = pastOrderResult.pastOrder;
  const now = new Date();
  const session = options.session ?? null;

  const query = Customer.findOne({ shopId, mobileNumber });
  if (session) {
    query.session(session);
  }

  const existing = await query.lean();
  if (existing) {
    const update = {
      $inc: {
        totalSales: salesAmount,
        totalOrders: 1,
        points: POINTS_PER_ORDER,
      },
      $set: {
        lastUpdate: now,
      },
    };

    if (name) {
      update.$set.name = name;
    }

    if (pastOrder) {
      update.$push = { pastOrders: pastOrder };
    }

    let updateQuery = Customer.findOneAndUpdate({ _id: existing._id, shopId }, update, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (session) {
      updateQuery = updateQuery.session(session);
    }

    const updated = await updateQuery.lean();
    return { customer: updated };
  }

  const payload = {
    shopId,
    mobileNumber,
    name,
    totalSales: salesAmount,
    totalOrders: 1,
    points: POINTS_PER_ORDER,
    lastUpdate: now,
    pastOrders: pastOrder ? [pastOrder] : [],
  };

  if (session) {
    const [created] = await Customer.create([payload], { session });
    return { customer: created.toObject() };
  }

  const created = await Customer.create(payload);
  return { customer: created.toObject() };
}

async function removeCustomerData(input, options = {}) {
  const shopId = normalizeShopId(input?.shopId);
  if (!shopId) {
    return { error: 'Shop id is required' };
  }

  const mobileNumber = sanitizeMobile(input?.mobileNumber);
  if (!mobileNumber) {
    return { error: 'Valid mobile number is required' };
  }

  const salesAmount = roundMoney(input?.salesAmount);
  if (salesAmount <= 0) {
    return { error: 'Valid sales amount is required' };
  }

  const historyId = input?.historyId;
  const now = new Date();
  const session = options.session ?? null;

  const query = Customer.findOne({ shopId, mobileNumber });
  if (session) {
    query.session(session);
  }

  const existing = await query.lean();
  if (!existing) {
    return { skipped: true, reason: 'Customer record not found' };
  }

  const updated = await Customer.findOneAndUpdate(
    { _id: existing._id, shopId },
    {
      $set: {
        totalSales: roundMoney(Math.max(0, (existing.totalSales ?? 0) - salesAmount)),
        totalOrders: Math.max(0, (existing.totalOrders ?? 0) - 1),
        points: Math.max(0, (existing.points ?? 0) - POINTS_PER_ORDER),
        lastUpdate: now,
      },
      ...(historyId && mongoose.Types.ObjectId.isValid(String(historyId))
        ? { $pull: { pastOrders: { historyId } } }
        : {}),
    },
    {
      returnDocument: 'after',
      runValidators: true,
      session: session ?? undefined,
    },
  ).lean();

  return { customer: updated };
}

module.exports = {
  manageCustomerData,
  removeCustomerData,
  buildPastOrderSnapshot,
  POINTS_PER_ORDER,
};
