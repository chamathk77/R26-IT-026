const { fitLinearRegression } = require('./trendUtils');

const REPORTING_TIMEZONE = process.env.FORECAST_TIMEZONE || 'Asia/Colombo';

const WEEKDAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MIN_ORDERS_FOR_PATTERNS = 20;
const MIN_ORDERS_PER_BUCKET = 3;
const MIN_PRODUCT_ORDERS = 3;
const MIN_PRODUCTS_FOR_RANKING = 5;

function round2(value) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function localHour(date, timezone) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return Number(formatted);
}

function localWeekdayIndex(date, timezone) {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(date);
  const index = WEEKDAY_KEYS.indexOf(label);
  return index === -1 ? date.getDay() : index;
}

function hourRangeLabel(hour) {
  const toClock = (h) => {
    const twelveHour = h % 12 === 0 ? 12 : h % 12;
    return `${twelveHour}${h < 12 ? 'AM' : 'PM'}`;
  };
  return `${toClock(hour)}–${toClock((hour + 1) % 24)}`;
}

/**
 * Buckets orders by hour-of-day in the shop's reporting timezone and flags
 * the busiest hour, gated on a minimum sample size so a handful of orders
 * can't crown a "peak hour".
 */
function computeHourlyPattern(orders, timezone = REPORTING_TIMEZONE) {
  const buckets = Array.from({ length: 24 }, () => ({ totalSales: 0, orderCount: 0 }));

  for (const order of orders) {
    const hour = localHour(new Date(order.checkOutTime), timezone);
    buckets[hour].totalSales += order.totalAmount;
    buckets[hour].orderCount += 1;
  }

  const hours = buckets.map((bucket, hour) => ({
    hour,
    label: hourRangeLabel(hour),
    totalSales: round2(bucket.totalSales),
    orderCount: bucket.orderCount,
    avgSales: bucket.orderCount ? round2(bucket.totalSales / bucket.orderCount) : 0,
  }));

  const eligible = hours.filter((row) => row.orderCount >= MIN_ORDERS_PER_BUCKET);
  if (!eligible.length) {
    return { hours, peakHour: null };
  }

  const overallAvg = mean(eligible.map((row) => row.avgSales));
  const busiest = eligible.reduce((best, row) => (row.avgSales > best.avgSales ? row : best));
  const upliftPercent =
    overallAvg > 0 ? round2(((busiest.avgSales - overallAvg) / overallAvg) * 100) : 0;

  return { hours, peakHour: { ...busiest, upliftPercent } };
}

/** Same idea for day-of-week, plus a direct weekday-vs-weekend comparison. */
function computeDailyPattern(orders, timezone = REPORTING_TIMEZONE) {
  const buckets = Array.from({ length: 7 }, () => ({ totalSales: 0, orderCount: 0 }));

  for (const order of orders) {
    const day = localWeekdayIndex(new Date(order.checkOutTime), timezone);
    buckets[day].totalSales += order.totalAmount;
    buckets[day].orderCount += 1;
  }

  const days = buckets.map((bucket, day) => ({
    day,
    label: WEEKDAY_LABELS[day],
    totalSales: round2(bucket.totalSales),
    orderCount: bucket.orderCount,
    avgSales: bucket.orderCount ? round2(bucket.totalSales / bucket.orderCount) : 0,
  }));

  const weekday = days.filter((row) => row.day >= 1 && row.day <= 5 && row.orderCount > 0);
  const weekend = days.filter((row) => (row.day === 0 || row.day === 6) && row.orderCount > 0);

  let weekendVsWeekday = null;
  if (weekday.length && weekend.length) {
    const weekdayAvg = mean(weekday.map((row) => row.avgSales));
    const weekendAvg = mean(weekend.map((row) => row.avgSales));
    const higher = weekendAvg >= weekdayAvg ? 'weekend' : 'weekday';
    const base = higher === 'weekend' ? weekdayAvg : weekendAvg;
    const diffPercent = base > 0 ? round2((Math.abs(weekendAvg - weekdayAvg) / base) * 100) : 0;

    weekendVsWeekday = {
      weekdayAvg: round2(weekdayAvg),
      weekendAvg: round2(weekendAvg),
      higher,
      diffPercent,
    };
  }

  const eligible = days.filter((row) => row.orderCount >= MIN_ORDERS_PER_BUCKET);
  const peakDay = eligible.length
    ? eligible.reduce((best, row) => (row.avgSales > best.avgSales ? row : best))
    : null;

  return { days, peakDay, weekendVsWeekday };
}

/**
 * Ranks products by units sold in the window. Revenue is an estimate — line
 * items on History only snapshot unit cost, not the selling price at the
 * time, so revenue = qty * current catalog price rather than the historical
 * price. "Slow movers" prioritizes catalog products with zero sales in the
 * window over merely low-selling ones, since that's the more actionable
 * signal for a business owner.
 */
function computeProductRankings(orders, products, options = {}) {
  const topCount = options.topCount ?? 5;
  const slowCount = options.slowCount ?? 5;

  const priceById = new Map(products.map((product) => [String(product._id), product.amount ?? 0]));
  const soldMap = new Map();

  for (const order of orders) {
    for (const item of order.items ?? []) {
      const key = item.productId ? String(item.productId) : `name:${item.productName}`;
      if (!soldMap.has(key)) {
        soldMap.set(key, {
          productId: item.productId ?? null,
          productName: item.productName,
          qtySold: 0,
          orderCount: 0,
        });
      }
      const entry = soldMap.get(key);
      entry.qtySold += item.qty ?? 0;
      entry.orderCount += 1;
    }
  }

  const sold = Array.from(soldMap.values()).map((entry) => ({
    ...entry,
    estimatedRevenue: round2(entry.qtySold * (priceById.get(String(entry.productId)) ?? 0)),
  }));

  const topProducts = [...sold].sort((a, b) => b.qtySold - a.qtySold).slice(0, topCount);
  const topKeys = new Set(
    topProducts.map((entry) => (entry.productId ? String(entry.productId) : `name:${entry.productName}`)),
  );

  const neverSold = products
    .filter((product) => !soldMap.has(String(product._id)))
    .map((product) => ({
      productId: product._id,
      productName: product.productName,
      qtySold: 0,
      orderCount: 0,
      estimatedRevenue: 0,
    }));

  // Excludes anything already surfaced as a top seller — with a small catalog,
  // padding the slow-movers list with the same best-sellers would be actively
  // misleading rather than just unhelpful.
  const lowSelling = sold
    .filter((entry) => entry.orderCount >= MIN_PRODUCT_ORDERS)
    .filter(
      (entry) => !topKeys.has(entry.productId ? String(entry.productId) : `name:${entry.productName}`),
    )
    .sort((a, b) => a.qtySold - b.qtySold);

  const slowProducts = [...neverSold, ...lowSelling].slice(0, slowCount);

  const rankingReady = products.length >= MIN_PRODUCTS_FOR_RANKING;

  return {
    rankingReady,
    productsTracked: products.length,
    topProducts: rankingReady ? topProducts : [],
    slowProducts: rankingReady ? slowProducts : [],
  };
}

/**
 * OLS trend fit (trendUtils.js) classified against the series' own average
 * level so "increasing" means something proportional, not just slope > 0 on
 * tiny numbers.
 */
function computeSalesTrend(monthlySeries) {
  if (!monthlySeries || monthlySeries.length < 3) {
    return { direction: 'unknown', monthlyChangePercent: 0, monthsAnalyzed: monthlySeries?.length ?? 0 };
  }

  const salesSeries = monthlySeries.map((row) => row.sales);
  const { slope } = fitLinearRegression(salesSeries);
  const level = mean(salesSeries) || 1;
  const monthlyChangePercent = round2((slope / level) * 100);

  let direction = 'stable';
  if (monthlyChangePercent >= 3) direction = 'increasing';
  else if (monthlyChangePercent <= -3) direction = 'decreasing';

  return {
    direction,
    monthlyChangePercent,
    monthsAnalyzed: monthlySeries.length,
    method: 'linear_regression',
  };
}

function describeDataQuality(orders, lookbackDays) {
  const ordersAnalyzed = orders.length;
  const distinctDays = new Set(
    orders.map((order) => new Date(order.checkOutTime).toISOString().slice(0, 10)),
  ).size;

  if (ordersAnalyzed === 0) {
    return {
      level: 'none',
      ordersAnalyzed,
      daysOfHistory: 0,
      lookbackDays,
      message: 'No submitted sales in the analysis window yet. Insights will appear once orders come in.',
    };
  }

  if (ordersAnalyzed < MIN_ORDERS_FOR_PATTERNS || distinctDays < 7) {
    return {
      level: 'insufficient',
      ordersAnalyzed,
      daysOfHistory: distinctDays,
      lookbackDays,
      message: `Only ${ordersAnalyzed} order(s) across ${distinctDays} day(s) so far. At least ${MIN_ORDERS_FOR_PATTERNS} orders across a week are needed for reliable patterns.`,
    };
  }

  if (distinctDays < 30) {
    return {
      level: 'limited',
      ordersAnalyzed,
      daysOfHistory: distinctDays,
      lookbackDays,
      message: `Based on ${ordersAnalyzed} orders across ${distinctDays} days. Patterns will sharpen with a full month or more of history.`,
    };
  }

  return {
    level: 'good',
    ordersAnalyzed,
    daysOfHistory: distinctDays,
    lookbackDays,
    message: `Based on ${ordersAnalyzed} orders across ${distinctDays} days of history.`,
  };
}

/**
 * Turns the computed stats into the plain-English sentences the feature
 * leads with — the whole point being insights, not raw numbers. Each
 * insight carries a `type` (what kind of finding) and a `tone`
 * (positive/negative/warning/info/neutral) instead of just a sentence, so
 * the UI can pick an icon/color per insight without parsing English text.
 */
function generateInsights({ hourly, daily, products, trend, segments, identifiedShare }) {
  const insights = [];

  if (hourly.peakHour) {
    const up = hourly.peakHour.upliftPercent >= 0;
    insights.push({
      type: 'peak_hour',
      tone: 'info',
      text: `Sales peak between ${hourly.peakHour.label}, averaging ${Math.abs(hourly.peakHour.upliftPercent)}% ${
        up ? 'higher' : 'lower'
      } than other hours.`,
    });
  }

  if (daily.weekendVsWeekday) {
    const { higher, diffPercent } = daily.weekendVsWeekday;
    insights.push({
      type: 'weekend_weekday',
      tone: 'info',
      text: `${higher === 'weekend' ? 'Weekend' : 'Weekday'} sales are ${diffPercent}% higher than ${
        higher === 'weekend' ? 'weekday' : 'weekend'
      } sales.`,
    });
  }

  if (products.rankingReady && products.topProducts[0]) {
    const top = products.topProducts[0];
    insights.push({
      type: 'top_product',
      tone: 'positive',
      text: `${top.productName} is your best seller — ${top.qtySold} units sold in this period.`,
    });
  }

  if (products.rankingReady && products.slowProducts[0]) {
    const slow = products.slowProducts[0];
    insights.push({
      type: 'slow_product',
      tone: 'warning',
      text:
        slow.qtySold === 0
          ? `${slow.productName} had no sales in this period — consider a promotion or menu review.`
          : `${slow.productName} is a slow mover — only ${slow.qtySold} units sold in this period.`,
    });
  }

  if (trend.direction === 'increasing' || trend.direction === 'decreasing') {
    insights.push({
      type: 'trend',
      tone: trend.direction === 'increasing' ? 'positive' : 'negative',
      text: `Overall sales are trending ${trend.direction} — about ${Math.abs(trend.monthlyChangePercent)}% per month over the last ${trend.monthsAnalyzed} months.`,
    });
  }

  if (segments.segmentationReady) {
    const top = segments.segments[0];
    const lapsed = segments.segments.find((segment) => segment.label === 'At risk / Lapsed');
    if (top) {
      insights.push({
        type: 'segment_top',
        tone: 'positive',
        text: `${top.label} customers make up ${top.sharePercent}% of your identified customers but drive ${top.revenueSharePercent}% of tracked revenue.`,
      });
    }
    if (lapsed && lapsed.size > 0) {
      insights.push({
        type: 'segment_lapsed',
        tone: 'warning',
        text: `${lapsed.size} customer(s) look at-risk or lapsed — averaging ${lapsed.avgRecencyDays} days since their last order.`,
      });
    }
  }

  if (Number.isFinite(identifiedShare)) {
    insights.push({
      type: 'identified_share',
      tone: 'neutral',
      text: `${identifiedShare}% of orders in this period are linked to an identified customer.`,
    });
  }

  return insights;
}

module.exports = {
  computeHourlyPattern,
  computeDailyPattern,
  computeProductRankings,
  computeSalesTrend,
  describeDataQuality,
  generateInsights,
  MIN_ORDERS_FOR_PATTERNS,
};
