const mongoose = require('mongoose');
const History = require('../models/history');
const SalePerson = require('../models/salePerson');

const KPI_PERIOD_KEYS = new Set(['current_month', 'this_month', 'last_month', 'last_3_months']);
const ORDER_ID_MIN_LENGTH = 6;
const SUBMITTED_HISTORY_STATUS = 'submited';

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function normalizeBranchId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function buildKpiSubmittedHistoryFilter(shopId, branchId, extra = {}) {
  return {
    shopId,
    branchId: normalizeBranchId(branchId),
    status: SUBMITTED_HISTORY_STATUS,
    ...extra,
  };
}

function requireShopAndBranchId(req, res) {
  const shopId = normalizeShopId(req.user?.shopId);
  if (!shopId) {
    res.status(400).json({ success: false, message: 'Shop id is required' });
    return null;
  }

  const branchId = normalizeBranchId(req.user?.branchId);
  if (!branchId) {
    res.status(400).json({
      success: false,
      message: 'Branch id is required. Please select a branch first.',
      code: 'BRANCH_REQUIRED',
    });
    return null;
  }

  return { shopId, branchId };
}

function roundMoney(value) {
  return Number(Math.max(0, value).toFixed(2));
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getCurrentMonthRange(referenceDate = new Date()) {
  const monthStart = startOfDay(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
  );
  const monthEnd = endOfDay(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0),
  );
  return { monthStart, monthEnd };
}

function parseFilterDate(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function normalizeKpiPeriod(value) {
  const period = String(value ?? '')
    .trim()
    .toLowerCase();
  if (period === 'this_month') {
    return 'current_month';
  }
  return period;
}

function resolveKpiDateRange(query) {
  const startDateRaw = parseFilterDate(query?.startDate);
  if (startDateRaw === undefined) {
    return { error: 'startDate is invalid' };
  }

  const endDateRaw = parseFilterDate(query?.endDate);
  if (endDateRaw === undefined) {
    return { error: 'endDate is invalid' };
  }

  const hasStart = Boolean(startDateRaw);
  const hasEnd = Boolean(endDateRaw);

  if (hasStart !== hasEnd) {
    return { error: 'Both startDate and endDate are required for a custom date range' };
  }

  const periodRaw = query?.period;
  const hasPeriod =
    periodRaw !== undefined && periodRaw !== null && String(periodRaw).trim() !== '';

  if (hasStart && hasEnd && hasPeriod) {
    return { error: 'Use either period or a custom date range, not both' };
  }

  if (hasStart && hasEnd) {
    const rangeStart = startOfDay(startDateRaw);
    const rangeEnd = endOfDay(endDateRaw);
    if (rangeStart > rangeEnd) {
      return { error: 'startDate cannot be after endDate' };
    }

    return {
      rangeStart,
      rangeEnd,
      appliedFilters: {
        filterType: 'custom_range',
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      },
    };
  }

  if (!hasPeriod) {
    return {
      error: 'Select a period (current_month, last_month, last_3_months) or provide startDate and endDate',
    };
  }

  const period = normalizeKpiPeriod(periodRaw);
  if (!KPI_PERIOD_KEYS.has(period)) {
    return {
      error: 'Invalid period. Use current_month, this_month, last_month, or last_3_months',
    };
  }

  const now = new Date();
  let rangeStart;
  let rangeEnd;

  switch (period) {
    case 'last_month': {
      const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      rangeStart = startOfDay(new Date(ref.getFullYear(), ref.getMonth(), 1));
      rangeEnd = endOfDay(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
      break;
    }
    case 'last_3_months':
      rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 2, 1));
      rangeEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
    case 'current_month':
    default: {
      const currentMonth = getCurrentMonthRange(now);
      rangeStart = currentMonth.monthStart;
      rangeEnd = currentMonth.monthEnd;
      break;
    }
  }

  return {
    rangeStart,
    rangeEnd,
    appliedFilters: {
      filterType: 'period',
      period,
    },
  };
}

function mapSalesPersonSummary(person, stats) {
  const firstName = person?.firstName ?? '';
  const lastName = person?.lastName ?? '';
  const fullName = getSalePersonFullName(firstName, lastName) || 'Unknown';

  return {
    salesPersonId: stats.salesPersonId,
    salePersonId: person?.salePersonId ?? null,
    firstName,
    lastName,
    fullName,
    position: person?.position ?? '',
    workCount: stats.workCount,
    totalSalesAmount: stats.totalSalesAmount,
  };
}

function getSalePersonFullName(firstName, lastName) {
  return `${String(firstName ?? '').trim()} ${String(lastName ?? '').trim()}`.trim();
}

function normalizeOrderId(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function mapHistoryRecord(record) {
  return {
    _id: record._id,
    shopId: record.shopId,
    branchId: record.branchId ?? '',
    cartId: record.cartId,
    cartNumber: record.cartNumber,
    orderId: record.orderId,
    checkOutTime: record.checkOutTime,
    amount: roundMoney(record.amount),
    isDiscount: Boolean(record.isDiscount),
    discountedAmount: roundMoney(record.discountedAmount ?? 0),
    items: (record.items ?? []).map((item) => ({
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
      unitCost: item.unitCost ?? null,
    })),
    totalAmount: roundMoney(record.totalAmount),
    customerName: record.customerName ?? '',
    customerMobile: record.customerMobile ?? '',
    userId: record.userId,
    submittedUserId: record.submittedUserId,
    submittedUserName: record.submittedUserName ?? '',
    paymentOption: record.paymentOption,
    status: record.status ?? 'submited',
    isReversed: Boolean(record.isReversed),
    reversedAt: record.reversedAt ?? null,
    reversedUserId: record.reversedUserId ?? null,
    reversedUserName: record.reversedUserName ?? null,
    salesPersonId: record.salesPersonId ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function resolveOptionalSalesPersonId(salesPersonIdRaw, shopId, branchId) {
  if (
    salesPersonIdRaw === undefined ||
    salesPersonIdRaw === null ||
    String(salesPersonIdRaw).trim() === ''
  ) {
    return { salesPersonId: null };
  }

  const salesPersonId = String(salesPersonIdRaw).trim();
  if (!mongoose.Types.ObjectId.isValid(salesPersonId)) {
    return { error: 'Invalid sales person id' };
  }

  const salePerson = await SalePerson.findOne({
    _id: salesPersonId,
    shopId,
    allowedBranchIds: normalizeBranchId(branchId),
  }).lean();
  if (!salePerson) {
    return { error: 'Sales person not found for this shop and branch' };
  }

  return { salesPersonId: salePerson._id };
}

async function resolveRequiredSalesPersonId(salesPersonIdRaw, shopId, branchId) {
  if (
    salesPersonIdRaw === undefined ||
    salesPersonIdRaw === null ||
    String(salesPersonIdRaw).trim() === ''
  ) {
    return { error: 'Sales person id is required' };
  }

  return resolveOptionalSalesPersonId(salesPersonIdRaw, shopId, branchId);
}

function parsePagination(query) {
  const pageRaw = parseInt(String(query?.page ?? '1'), 10);
  const limitRaw = parseInt(String(query?.limit ?? '20'), 10);

  const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  const limit = Number.isNaN(limitRaw) ? 20 : Math.min(100, Math.max(1, limitRaw));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

async function findShopHistoryByOrderId(shopId, branchId, orderIdRaw) {
  const orderId = normalizeOrderId(orderIdRaw);
  if (!orderId || orderId.length < ORDER_ID_MIN_LENGTH) {
    return { error: 'Valid order id is required' };
  }

  const history = await History.findOne(
    buildKpiSubmittedHistoryFilter(shopId, branchId, { orderId }),
  ).lean();
  if (!history) {
    return {
      error: 'Submitted history record not found for this order id and branch',
      status: 404,
    };
  }

  return { history, orderId };
}

const getKpiHistoryByOrderId = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const lookup = await findShopHistoryByOrderId(shopId, branchId, req.params?.orderId);
    if (lookup.error) {
      return res.status(lookup.status ?? 400).json({ success: false, message: lookup.error });
    }

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: mapHistoryRecord(lookup.history),
      message: 'History record loaded',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const assignKpiHistorySalesPerson = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const lookup = await findShopHistoryByOrderId(shopId, branchId, req.params?.orderId);
    if (lookup.error) {
      return res.status(lookup.status ?? 400).json({ success: false, message: lookup.error });
    }

    const { history } = lookup;

    if (history.status !== SUBMITTED_HISTORY_STATUS) {
      return res.status(400).json({
        success: false,
        message: 'Sales person can only be assigned to submitted history records',
      });
    }

    const salesPersonResult = await resolveRequiredSalesPersonId(
      req.body?.salesPersonId,
      shopId,
      branchId,
    );
    if (salesPersonResult.error) {
      return res.status(400).json({ success: false, message: salesPersonResult.error });
    }

    const updated = await History.findOneAndUpdate(
      { _id: history._id, shopId, branchId },
      { $set: { salesPersonId: salesPersonResult.salesPersonId } },
      { returnDocument: 'after' },
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'History record not found' });
    }

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: mapHistoryRecord(updated),
      message: 'Sales person assigned to history record',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getKpiSummary = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const rangeResult = resolveKpiDateRange(req.query);
    if (rangeResult.error) {
      return res.status(400).json({ success: false, message: rangeResult.error });
    }

    const { rangeStart, rangeEnd, appliedFilters } = rangeResult;

    const records = await History.find(
      buildKpiSubmittedHistoryFilter(shopId, branchId, {
        checkOutTime: { $gte: rangeStart, $lte: rangeEnd },
      }),
    )
      .select('salesPersonId totalAmount orderId cartNumber checkOutTime branchId')
      .sort({ checkOutTime: -1 })
      .lean();

    const salePersons = await SalePerson.find({ shopId, allowedBranchIds: branchId })
      .select('_id salePersonId firstName lastName position allowedBranchIds')
      .lean();
    const salePersonById = new Map(salePersons.map((person) => [String(person._id), person]));

    const salesPersonStats = new Map();
    const unassignedOrders = [];
    let totalSales = 0;

    for (const record of records) {
      const amount = roundMoney(record.totalAmount ?? 0);
      totalSales = roundMoney(totalSales + amount);

      if (!record.salesPersonId) {
        unassignedOrders.push({
          orderId: record.orderId,
          cartNumber: record.cartNumber,
          totalAmount: amount,
          checkOutTime: record.checkOutTime,
        });
        continue;
      }

      const salesPersonId = String(record.salesPersonId);
      const existing = salesPersonStats.get(salesPersonId) ?? {
        salesPersonId,
        workCount: 0,
        totalSalesAmount: 0,
      };

      existing.workCount += 1;
      existing.totalSalesAmount = roundMoney(existing.totalSalesAmount + amount);
      salesPersonStats.set(salesPersonId, existing);
    }

    const salesPersons = Array.from(salesPersonStats.values())
      .map((stats) => mapSalesPersonSummary(salePersonById.get(stats.salesPersonId), stats))
      .sort((a, b) => b.totalSalesAmount - a.totalSalesAmount);

    const unassignedTotalSales = roundMoney(
      unassignedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    );

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: {
        filters: appliedFilters,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        totalSales: roundMoney(totalSales),
        orderCount: records.length,
        salesPersons,
        unassignedSales: {
          count: unassignedOrders.length,
          totalSalesAmount: unassignedTotalSales,
          orders: unassignedOrders.map((order) => ({
            orderId: order.orderId,
            cartNumber: order.cartNumber,
            totalAmount: order.totalAmount,
            checkOutTime: order.checkOutTime,
          })),
        },
      },
      message: 'KPI summary loaded',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getKpiHistorySummary = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const salesPersonResult = await resolveRequiredSalesPersonId(
      req.query?.salesPersonId,
      shopId,
      branchId,
    );
    if (salesPersonResult.error) {
      return res.status(400).json({ success: false, message: salesPersonResult.error });
    }

    const startDateRaw = parseFilterDate(req.query?.startDate);
    if (startDateRaw === undefined) {
      return res.status(400).json({ success: false, message: 'startDate is invalid' });
    }

    const endDateRaw = parseFilterDate(req.query?.endDate);
    if (endDateRaw === undefined) {
      return res.status(400).json({ success: false, message: 'endDate is invalid' });
    }

    if (!startDateRaw || !endDateRaw) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required',
      });
    }

    const rangeStart = startOfDay(startDateRaw);
    const rangeEnd = endOfDay(endDateRaw);
    const todayEnd = endOfDay(new Date());

    if (rangeStart > todayEnd || rangeEnd > todayEnd) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate cannot be after today',
      });
    }

    if (rangeStart > rangeEnd) {
      return res.status(400).json({ success: false, message: 'startDate cannot be after endDate' });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const filter = buildKpiSubmittedHistoryFilter(shopId, branchId, {
      salesPersonId: salesPersonResult.salesPersonId,
      checkOutTime: { $gte: rangeStart, $lte: rangeEnd },
    });

    const [total, records, salePerson, aggregateResult] = await Promise.all([
      History.countDocuments(filter),
      History.find(filter)
        .sort({ checkOutTime: -1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SalePerson.findOne({
        _id: salesPersonResult.salesPersonId,
        shopId,
        allowedBranchIds: branchId,
      })
        .select('_id salePersonId firstName lastName position allowedBranchIds')
        .lean(),
      History.aggregate([
        { $match: filter },
        { $group: { _id: null, totalSales: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const grandTotalSales = roundMoney(aggregateResult[0]?.totalSales ?? 0);

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      count: records.length,
      total,
      filters: {
        salesPersonId: String(salesPersonResult.salesPersonId),
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
        salesPersonName: getSalePersonFullName(salePerson?.firstName, salePerson?.lastName),
        salePersonId: salePerson?.salePersonId ?? null,
        position: salePerson?.position ?? '',
        branchId,
      },
      summary: {
        orderCount: total,
        totalSalesAmount: grandTotalSales,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: records.map(mapHistoryRecord),
      message: 'KPI history summary loaded',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getKpiSummary,
  getKpiHistoryByOrderId,
  getKpiHistorySummary,
  assignKpiHistorySalesPerson,
};
