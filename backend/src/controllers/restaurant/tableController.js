const mongoose = require('mongoose');
const ShopTable = require('../../models/restaurant/shopTable');
const Cart = require('../../models/cart');
const User = require('../../models/user');

const TABLE_MANAGER_ROLES = ['admin', 'owner'];
const MAX_BULK_TABLE_COUNT = 200;
const OPEN_TABLE_CART_STATUSES = Cart.OPEN_TABLE_CART_STATUSES;

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

function invalidIdResponse(res) {
  return res.status(400).json({ message: 'Invalid table id', success: false });
}

async function getTableManagerContext(userId) {
  const user = await User.findById(userId).select('role shopId').lean();
  if (!user) {
    return { error: { status: 401, message: 'Not authorized, user not found' } };
  }
  if (!TABLE_MANAGER_ROLES.includes(user.role)) {
    return { error: { status: 403, message: 'Only admin and owner can manage tables' } };
  }
  const shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
  if (!shopId) {
    return { error: { status: 400, message: 'Shop id is required' } };
  }
  return { shopId, role: user.role };
}

function mapTableRecord(table, occupancy = null) {
  const isOccupied = Boolean(occupancy);
  return {
    _id: table._id,
    shopId: table.shopId,
    branchId: table.branchId,
    tableNumber: table.tableNumber,
    tableName: table.tableName ?? '',
    capacity: table.capacity ?? null,
    zone: table.zone ?? '',
    sortOrder: table.sortOrder ?? 0,
    isActive: Boolean(table.isActive),
    status: isOccupied ? 'occupied' : 'free',
    occupiedSessionId: occupancy?.sessionId ?? null,
    occupiedCartNumber: occupancy?.cartNumber ?? null,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
  };
}

async function getOccupiedTableMap(shopId, branchId) {
  const carts = await Cart.find({
    shopId,
    branchId,
    orderType: 'dine_in',
    tableId: { $ne: null },
    status: { $in: OPEN_TABLE_CART_STATUSES },
  })
    .select('tableId sessionId cartNumber')
    .lean();

  const map = new Map();
  for (const cart of carts) {
    map.set(String(cart.tableId), {
      sessionId: cart.sessionId,
      cartNumber: cart.cartNumber,
    });
  }
  return map;
}

function parseOptionalCapacity(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) {
    return { error: 'capacity must be a positive number' };
  }
  return parsed;
}

function parseOptionalSortOrder(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return { error: 'sortOrder must be a number' };
  }
  return parsed;
}

const getTables = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;

    const { shopId, branchId } = context;
    const includeInactive =
      String(req.query?.includeInactive ?? '').trim().toLowerCase() === 'true';

    const filter = { shopId, branchId };
    if (!includeInactive) {
      filter.isActive = true;
    }

    const tables = await ShopTable.find(filter)
      .sort({ sortOrder: 1, tableNumber: 1 })
      .lean();

    const occupiedMap = await getOccupiedTableMap(shopId, branchId);

    res.status(200).json({
      success: true,
      count: tables.length,
      data: tables.map((table) => mapTableRecord(table, occupiedMap.get(String(table._id)) ?? null)),
      message: 'Tables loaded',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createTable = async (req, res) => {
  try {
    const manager = await getTableManagerContext(req.user.id);
    if (manager.error) {
      return res.status(manager.error.status).json({
        success: false,
        message: manager.error.message,
      });
    }

    const context = requireShopAndBranchId(req, res);
    if (!context) return;

    const { shopId, branchId } = context;
    const { tableNumber, tableName, capacity, zone, sortOrder } = req.body;

    if (tableNumber === undefined || String(tableNumber).trim() === '') {
      return res.status(400).json({ success: false, message: 'tableNumber is required' });
    }

    const parsedCapacity = parseOptionalCapacity(capacity);
    if (parsedCapacity && typeof parsedCapacity === 'object' && parsedCapacity.error) {
      return res.status(400).json({ success: false, message: parsedCapacity.error });
    }

    const parsedSortOrder = parseOptionalSortOrder(sortOrder, 0);
    if (typeof parsedSortOrder === 'object' && parsedSortOrder.error) {
      return res.status(400).json({ success: false, message: parsedSortOrder.error });
    }

    const table = await ShopTable.create({
      shopId,
      branchId,
      tableNumber: String(tableNumber).trim(),
      tableName: tableName == null ? '' : String(tableName).trim(),
      capacity: parsedCapacity,
      zone: zone == null ? '' : String(zone).trim(),
      sortOrder: parsedSortOrder,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: mapTableRecord(table),
      message: 'Table created',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A table with this number already exists for this branch',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const bulkCreateTables = async (req, res) => {
  try {
    const manager = await getTableManagerContext(req.user.id);
    if (manager.error) {
      return res.status(manager.error.status).json({
        success: false,
        message: manager.error.message,
      });
    }

    const context = requireShopAndBranchId(req, res);
    if (!context) return;

    const { shopId, branchId } = context;
    const { count, startNumber, prefix, zone, defaultCapacity } = req.body;

    const tableCount = Number(count);
    if (!Number.isInteger(tableCount) || tableCount < 1 || tableCount > MAX_BULK_TABLE_COUNT) {
      return res.status(400).json({
        success: false,
        message: `count must be an integer between 1 and ${MAX_BULK_TABLE_COUNT}`,
      });
    }

    const start = startNumber === undefined || startNumber === null ? 1 : Number(startNumber);
    if (!Number.isInteger(start) || start < 0) {
      return res.status(400).json({
        success: false,
        message: 'startNumber must be a non-negative integer',
      });
    }

    const parsedCapacity = parseOptionalCapacity(defaultCapacity);
    if (parsedCapacity && typeof parsedCapacity === 'object' && parsedCapacity.error) {
      return res.status(400).json({ success: false, message: parsedCapacity.error });
    }

    const prefixValue = prefix == null ? '' : String(prefix).trim();
    const zoneValue = zone == null ? '' : String(zone).trim();

    const maxSortDoc = await ShopTable.findOne({ shopId, branchId })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean();
    const sortBase = maxSortDoc?.sortOrder ?? 0;

    const docs = [];
    const seenNumbers = new Set();
    for (let index = 0; index < tableCount; index += 1) {
      const numberValue = start + index;
      const tableNumber = prefixValue ? `${prefixValue}${numberValue}` : String(numberValue);

      if (!tableNumber) {
        return res.status(400).json({
          success: false,
          message: 'Generated table number cannot be empty',
        });
      }

      if (seenNumbers.has(tableNumber)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate table number "${tableNumber}" in this bulk request`,
        });
      }
      seenNumbers.add(tableNumber);

      docs.push({
        shopId,
        branchId,
        tableNumber,
        tableName: '',
        capacity: parsedCapacity,
        zone: zoneValue,
        sortOrder: sortBase + numberValue,
        isActive: true,
      });
    }

    const created = await ShopTable.insertMany(docs, { ordered: false });

    res.status(201).json({
      success: true,
      count: created.length,
      data: created.map(mapTableRecord),
      message: `${created.length} table${created.length === 1 ? '' : 's'} created`,
    });
  } catch (error) {
    if (error.code === 11000) {
      const inserted = error.insertedDocs?.length ?? 0;
      return res.status(409).json({
        success: false,
        message:
          inserted > 0
            ? `Some tables were created (${inserted}), but duplicates were skipped`
            : 'One or more table numbers already exist for this branch',
        count: inserted,
        data: Array.isArray(error.insertedDocs)
          ? error.insertedDocs.map(mapTableRecord)
          : [],
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTable = async (req, res) => {
  try {
    const manager = await getTableManagerContext(req.user.id);
    if (manager.error) {
      return res.status(manager.error.status).json({
        success: false,
        message: manager.error.message,
      });
    }

    const context = requireShopAndBranchId(req, res);
    if (!context) return;

    const { shopId, branchId } = context;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const table = await ShopTable.findOne({ _id: id, shopId, branchId });
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const updates = {};
    const { tableNumber, tableName, capacity, zone, sortOrder, isActive } = req.body;

    if (tableNumber !== undefined) {
      const trimmed = String(tableNumber).trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, message: 'tableNumber cannot be empty' });
      }
      updates.tableNumber = trimmed;
    }

    if (tableName !== undefined) {
      updates.tableName = String(tableName).trim();
    }

    if (capacity !== undefined) {
      const parsedCapacity = parseOptionalCapacity(capacity);
      if (parsedCapacity && typeof parsedCapacity === 'object' && parsedCapacity.error) {
        return res.status(400).json({ success: false, message: parsedCapacity.error });
      }
      updates.capacity = parsedCapacity;
    }

    if (zone !== undefined) {
      updates.zone = String(zone).trim();
    }

    if (sortOrder !== undefined) {
      const parsedSortOrder = parseOptionalSortOrder(sortOrder, table.sortOrder ?? 0);
      if (typeof parsedSortOrder === 'object' && parsedSortOrder.error) {
        return res.status(400).json({ success: false, message: parsedSortOrder.error });
      }
      updates.sortOrder = parsedSortOrder;
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    Object.assign(table, updates);
    await table.save();

    res.status(200).json({
      success: true,
      data: mapTableRecord(table),
      message: 'Table updated',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A table with this number already exists for this branch',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const bulkDeleteTables = async (req, res) => {
  try {
    const manager = await getTableManagerContext(req.user.id);
    if (manager.error) {
      return res.status(manager.error.status).json({
        success: false,
        message: manager.error.message,
      });
    }

    const context = requireShopAndBranchId(req, res);
    if (!context) return;

    const { shopId, branchId } = context;
    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids = [...new Set(rawIds.map((value) => String(value).trim()).filter(Boolean))];

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one table id is required',
      });
    }

    if (ids.length > MAX_BULK_TABLE_COUNT) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete more than ${MAX_BULK_TABLE_COUNT} tables at once`,
      });
    }

    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more table ids are invalid',
      });
    }

    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    const result = await ShopTable.updateMany(
      { _id: { $in: objectIds }, shopId, branchId, isActive: true },
      { $set: { isActive: false } },
    );

    res.status(200).json({
      success: true,
      count: result.modifiedCount ?? 0,
      message: `${result.modifiedCount ?? 0} table${result.modifiedCount === 1 ? '' : 's'} removed`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTable = async (req, res) => {
  try {
    const manager = await getTableManagerContext(req.user.id);
    if (manager.error) {
      return res.status(manager.error.status).json({
        success: false,
        message: manager.error.message,
      });
    }

    const context = requireShopAndBranchId(req, res);
    if (!context) return;

    const { shopId, branchId } = context;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const table = await ShopTable.findOne({ _id: id, shopId, branchId });
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    table.isActive = false;
    await table.save();

    res.status(200).json({
      success: true,
      id: table._id,
      message: 'Table removed',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTables,
  createTable,
  bulkCreateTables,
  updateTable,
  deleteTable,
  bulkDeleteTables,
};
