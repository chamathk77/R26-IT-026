const History = require('../models/history');
const SalePerson = require('../models/salePerson');

const KPI_PERIOD_KEYS = new Set(['current_month', 'this_month', 'last_month', 'last_3_months']);

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function requireShopId(req, res) {
  const shopId = normalizeShopId(req.user?.shopId);
  if (!shopId) {
    res.status(400).json({ success: false, message: 'Shop id is required' });
    return null;
  }
  return shopId;
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

function getSalePersonFullName(firstName, lastName) {
  return `${String(firstName ?? '').trim()} ${String(lastName ?? '').trim()}`.trim();
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

const getKpiSummary = async (req, res) => {
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const rangeResult = resolveKpiDateRange(req.query);
    if (rangeResult.error) {
      return res.status(400).json({ success: false, message: rangeResult.error });
    }

    const { rangeStart, rangeEnd, appliedFilters } = rangeResult;

    const records = await History.find({
      shopId,
      status: 'submited',
      checkOutTime: { $gte: rangeStart, $lte: rangeEnd },
    })
      .select('salesPersonId totalAmount orderId checkOutTime')
      .sort({ checkOutTime: -1 })
      .lean();

    const salePersons = await SalePerson.find({ shopId })
      .select('_id salePersonId firstName lastName position')
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

module.exports = {
  getKpiSummary,
};
