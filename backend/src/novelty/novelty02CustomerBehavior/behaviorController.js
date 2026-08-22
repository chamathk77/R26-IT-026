const {
  getRecentOrders,
  getShopCustomers,
  getShopProducts,
  getSalesTrendSeries,
} = require('./behaviorDataService');
const {
  computeHourlyPattern,
  computeDailyPattern,
  computeProductRankings,
  computeSalesTrend,
  describeDataQuality,
  generateInsights,
} = require('./behaviorEngine');
const { computeCustomerSegmentsViaMl } = require('./segmentClientViaMl');

function normalizeId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function requireShopAndBranchId(req, res) {
  const shopId = normalizeId(req.user?.shopId);
  if (!shopId) {
    res.status(400).json({ success: false, message: 'Shop id is required' });
    return null;
  }

  const branchId = normalizeId(req.user?.branchId);
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

function round2(value) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}

const getCustomerBehaviorInsights = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const [{ orders, lookbackDays }, customers, products, monthlySeries] = await Promise.all([
      getRecentOrders(shopId, branchId),
      getShopCustomers(shopId),
      getShopProducts(shopId),
      getSalesTrendSeries(shopId, branchId),
    ]);

    const dataQuality = describeDataQuality(orders, lookbackDays);

    if (dataQuality.level === 'none' || dataQuality.level === 'insufficient') {
      return res.status(200).json({
        success: true,
        shopId,
        branchId,
        data: {
          generatedAt: new Date().toISOString(),
          lookbackDays,
          dataQuality,
          hourlyPattern: null,
          dailyPattern: null,
          productRankings: null,
          salesTrend: null,
          customerSegments: null,
          insights: [],
        },
        message: dataQuality.message,
      });
    }

    const hourly = computeHourlyPattern(orders);
    const daily = computeDailyPattern(orders);
    const products_ = computeProductRankings(orders, products);
    const trend = computeSalesTrend(monthlySeries);
    const segments = await computeCustomerSegmentsViaMl(customers);

    const identifiedOrders = orders.filter((order) => order.customerMobile).length;
    const identifiedShare = orders.length ? round2((identifiedOrders / orders.length) * 100) : 0;

    const insights = generateInsights({
      hourly,
      daily,
      products: products_,
      trend,
      segments,
      identifiedShare,
    });

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: {
        generatedAt: new Date().toISOString(),
        lookbackDays,
        dataQuality,
        hourlyPattern: hourly,
        dailyPattern: daily,
        productRankings: products_,
        salesTrend: trend,
        customerSegments: segments,
        identifiedOrderSharePercent: identifiedShare,
        insights,
      },
      message: 'Customer behavior insights generated',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCustomerBehaviorInsights,
};
