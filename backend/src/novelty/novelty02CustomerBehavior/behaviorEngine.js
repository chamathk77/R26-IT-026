const { fitLinearRegression } = require('../novelty01Forecasting/forecastEngine');

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
const MIN_CUSTOMERS_FOR_SEGMENTS = 12;
const SEGMENT_COUNT = 4;
const KMEANS_MAX_ITERATIONS = 50;
const KMEANS_CONVERGENCE_EPSILON = 1e-6;

function round2(value) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
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
 * Reuses novelty01's OLS trend fit rather than re-deriving slope math, then
 * classifies it against the series' own average level so "increasing" means
 * something proportional (not just slope > 0 on tiny numbers).
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

function daysBetween(a, b) {
  return Math.max(0, Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)));
}

function standardizeDimension(points, key) {
  const values = points.map((point) => point[key]);
  const avg = mean(values);
  const sd = standardDeviation(values);
  return points.map((point) => (sd === 0 ? 0 : (point[key] - avg) / sd));
}

function squaredDistance(point, centroid) {
  return (
    (point.recencyZ - centroid.recencyZ) ** 2 +
    (point.frequencyZ - centroid.frequencyZ) ** 2 +
    (point.monetaryZ - centroid.monetaryZ) ** 2
  );
}

/**
 * From-scratch k-means over standardized RFM features. Centroids are seeded
 * deterministically (evenly spaced across a loyalty-score ordering) rather
 * than randomly, so re-running against the same data always yields the same
 * segments — no `Math.random()`, consistent with the rest of the analysis
 * pipeline being reproducible.
 */
function kMeansRfm(points, k) {
  const scored = [...points].sort(
    (a, b) => a.monetaryZ + a.frequencyZ - a.recencyZ - (b.monetaryZ + b.frequencyZ - b.recencyZ),
  );

  let centroids = Array.from({ length: k }, (_, i) => {
    const index = Math.min(scored.length - 1, Math.floor((i * scored.length) / k));
    const seed = scored[index];
    return { recencyZ: seed.recencyZ, frequencyZ: seed.frequencyZ, monetaryZ: seed.monetaryZ };
  });

  let assignments = new Array(points.length).fill(0);

  for (let iteration = 0; iteration < KMEANS_MAX_ITERATIONS; iteration += 1) {
    const nextAssignments = points.map((point) => {
      let bestIndex = 0;
      let bestDistance = Infinity;
      centroids.forEach((centroid, index) => {
        const distance = squaredDistance(point, centroid);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      return bestIndex;
    });

    const nextCentroids = centroids.map((centroid, index) => {
      const members = points.filter((_, pointIndex) => nextAssignments[pointIndex] === index);
      if (!members.length) {
        const farthest = points.reduce((worst, point, pointIndex) => {
          const distance = squaredDistance(point, centroids[nextAssignments[pointIndex]]);
          return distance > worst.distance ? { point, distance } : worst;
        }, { point: centroid, distance: -1 });
        return { recencyZ: farthest.point.recencyZ, frequencyZ: farthest.point.frequencyZ, monetaryZ: farthest.point.monetaryZ };
      }
      return {
        recencyZ: mean(members.map((m) => m.recencyZ)),
        frequencyZ: mean(members.map((m) => m.frequencyZ)),
        monetaryZ: mean(members.map((m) => m.monetaryZ)),
      };
    });

    const movement = mean(
      nextCentroids.map((centroid, index) => Math.sqrt(squaredDistance(centroid, centroids[index]))),
    );

    centroids = nextCentroids;
    assignments = nextAssignments;

    if (movement < KMEANS_CONVERGENCE_EPSILON) break;
  }

  return { centroids, assignments };
}

const SEGMENT_LABELS = ['VIP / Loyal', 'Regular', 'Occasional', 'At risk / Lapsed'];

/**
 * RFM (Recency/Frequency/Monetary) segmentation via k-means, reading
 * straight off fields the Customer schema already tracks. Skips
 * segmentation below a minimum sample size rather than forcing four
 * clusters onto a handful of customers.
 */
function computeCustomerSegments(customers, options = {}) {
  const now = options.now ?? new Date();
  const withOrders = customers.filter((customer) => customer.totalOrders > 0);

  if (withOrders.length < MIN_CUSTOMERS_FOR_SEGMENTS) {
    return {
      segmentationReady: false,
      customersAnalyzed: withOrders.length,
      minimumRequired: MIN_CUSTOMERS_FOR_SEGMENTS,
      segments: [],
    };
  }

  const points = withOrders.map((customer) => ({
    mobileNumber: customer.mobileNumber,
    name: customer.name,
    recencyDays: daysBetween(now, new Date(customer.lastUpdate)),
    frequency: customer.totalOrders,
    monetary: customer.totalSales,
  }));

  const recencyZ = standardizeDimension(points, 'recencyDays');
  const frequencyZ = standardizeDimension(points, 'frequency');
  const monetaryZ = standardizeDimension(points, 'monetary');
  const standardized = points.map((point, index) => ({
    ...point,
    recencyZ: recencyZ[index],
    frequencyZ: frequencyZ[index],
    monetaryZ: monetaryZ[index],
  }));

  const { assignments } = kMeansRfm(standardized, SEGMENT_COUNT);

  const clusters = Array.from({ length: SEGMENT_COUNT }, () => []);
  standardized.forEach((point, index) => clusters[assignments[index]].push(point));

  const totalMonetary = mean(points.map((p) => p.monetary)) === 0 ? 1 : points.reduce((sum, p) => sum + p.monetary, 0);

  const ranked = clusters
    .map((members, index) => {
      if (!members.length) return null;
      const loyaltyScore = mean(members.map((m) => m.monetaryZ + m.frequencyZ - m.recencyZ));
      const clusterMonetary = members.reduce((sum, m) => sum + m.monetary, 0);
      return {
        index,
        loyaltyScore,
        size: members.length,
        sharePercent: round2((members.length / points.length) * 100),
        revenueSharePercent: round2((clusterMonetary / totalMonetary) * 100),
        avgRecencyDays: Math.round(mean(members.map((m) => m.recencyDays))),
        avgFrequency: round2(mean(members.map((m) => m.frequency))),
        avgMonetary: round2(mean(members.map((m) => m.monetary))),
        members,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.loyaltyScore - a.loyaltyScore);

  const segments = ranked.map((cluster, rank) => ({
    key: SEGMENT_LABELS[rank].toLowerCase().replace(/[^a-z]+/g, '_'),
    label: SEGMENT_LABELS[rank] ?? `Segment ${rank + 1}`,
    size: cluster.size,
    sharePercent: cluster.sharePercent,
    revenueSharePercent: cluster.revenueSharePercent,
    avgRecencyDays: cluster.avgRecencyDays,
    avgFrequency: cluster.avgFrequency,
    avgMonetary: cluster.avgMonetary,
  }));

  return {
    segmentationReady: true,
    method: 'rfm_kmeans',
    customersAnalyzed: withOrders.length,
    segments,
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
 * leads with — the whole point being insights, not raw numbers.
 */
/**
 * Each insight carries a `type` (what kind of finding) and a `tone`
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
  computeCustomerSegments,
  describeDataQuality,
  generateInsights,
  MIN_ORDERS_FOR_PATTERNS,
  MIN_CUSTOMERS_FOR_SEGMENTS,
  SEGMENT_COUNT,
};
