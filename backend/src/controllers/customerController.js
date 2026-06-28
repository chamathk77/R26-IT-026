const Customer = require('../models/customer');

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
  POINTS_PER_ORDER,
};
