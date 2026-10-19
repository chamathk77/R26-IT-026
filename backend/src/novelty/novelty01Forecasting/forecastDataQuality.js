/**
 * Data-quality layer between the raw monthly totals and the forecasting model.
 *
 * Micro-SME records are often incomplete: staff stop entering sales for a few
 * weeks, a month holds only a couple of test orders, or expenses are not
 * entered at all. A forecasting model cannot tell that apart from a real
 * collapse in demand, so a half-recorded final month drags every prediction
 * towards zero. This module flags such months against the shop's own typical
 * month and repairs the training series before it reaches the model:
 *
 *  - flagged months at the start or end are left out (the model forecasts
 *    through them instead);
 *  - flagged months in the middle are filled by linear interpolation from the
 *    nearest good months, so the series stays evenly spaced.
 */

const MIN_MONTHS_FOR_CHECK = 4;
const FEW_ORDERS_RATIO = 0.4;
const FEW_SALES_DAYS_RATIO = 0.5;
const FEW_EXPENSES_RATIO = 0.3;
const MIN_DAYS_FOR_WEEKDAY_PROFILE = 56;
const MIN_DAYS_FOR_PACING = 3;
const PACING_TOLERANCE = 0.1;

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round2(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

/** Day of week of a `YYYY-MM-DD` date, Monday = 0 … Sunday = 6. */
function weekdayMondayFirst(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

function daysInMonth(monthKeyValue) {
  const [year, month] = monthKeyValue.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dateKeysOfMonth(monthKeyValue) {
  return Array.from(
    { length: daysInMonth(monthKeyValue) },
    (_, index) => `${monthKeyValue}-${String(index + 1).padStart(2, '0')}`,
  );
}

/**
 * Compares every complete month with the shop's median month. Returns one
 * entry per problem found: `series` is the series affected ('sales' or 'costs').
 */
function findRecordingIssues(months) {
  if (months.length < MIN_MONTHS_FOR_CHECK) return [];

  const typicalOrders = median(months.map((row) => row.orderCount));
  const typicalDays = median(months.map((row) => row.activeDays));
  const typicalExpenses = median(months.map((row) => row.expenseCount));
  const typicalCosts = median(months.map((row) => row.costs));

  const issues = [];
  for (const row of months) {
    if (typicalOrders > 0 && row.orderCount < FEW_ORDERS_RATIO * typicalOrders) {
      issues.push({ month: row.month, label: row.label, series: 'sales', reason: 'few_orders' });
    } else if (
      typicalDays > 0 &&
      Number.isFinite(row.activeDays) &&
      row.activeDays < FEW_SALES_DAYS_RATIO * typicalDays
    ) {
      issues.push({ month: row.month, label: row.label, series: 'sales', reason: 'few_sales_days' });
    }

    if (typicalExpenses >= 1 && row.expenseCount === 0) {
      issues.push({ month: row.month, label: row.label, series: 'costs', reason: 'no_expenses' });
    } else if (typicalCosts > 0 && row.costs < FEW_EXPENSES_RATIO * typicalCosts) {
      issues.push({ month: row.month, label: row.label, series: 'costs', reason: 'few_expenses' });
    }
  }
  return issues;
}

function interpolateFlagged(values, flagged) {
  const result = [...values];
  for (let index = 0; index < result.length; index += 1) {
    if (!flagged[index]) continue;
    let before = index - 1;
    while (before >= 0 && flagged[before]) before -= 1;
    let after = index + 1;
    while (after < result.length && flagged[after]) after += 1;
    if (before < 0 || after >= result.length) continue;
    const share = (index - before) / (after - before);
    result[index] = round2(values[before] + share * (values[after] - values[before]));
  }
  return result;
}

/**
 * Builds the series the model is trained on from the complete months.
 */
function prepareTrainingSeries(completeMonths) {
  const issues = findRecordingIssues(completeMonths);
  const flaggedMonths = new Set(issues.map((issue) => issue.month));
  const salesFlags = completeMonths.map((row) =>
    issues.some((issue) => issue.month === row.month && issue.series === 'sales'),
  );
  const costFlags = completeMonths.map((row) =>
    issues.some((issue) => issue.month === row.month && issue.series === 'costs'),
  );

  let start = 0;
  while (start < completeMonths.length && flaggedMonths.has(completeMonths[start].month)) start += 1;
  let end = completeMonths.length;
  while (end > start && flaggedMonths.has(completeMonths[end - 1].month)) end -= 1;

  const used = completeMonths.slice(start, end);
  const sales = interpolateFlagged(
    used.map((row) => row.sales),
    salesFlags.slice(start, end),
  );
  const costs = interpolateFlagged(
    used.map((row) => row.costs),
    costFlags.slice(start, end),
  );

  const imputed = issues
    .filter((issue) => used.some((row) => row.month === issue.month))
    .map((issue) => ({ month: issue.month, label: issue.label, series: issue.series }));

  return {
    months: used,
    sales,
    costs,
    issues,
    excludedHead: completeMonths.slice(0, start).map((row) => row.month),
    excludedTail: completeMonths.slice(end).map((row) => row.month),
    imputed,
  };
}

/**
 * Average sales on each weekday relative to an average day (Monday first),
 * counted over every calendar day of the given months so that days the shop
 * is closed pull that weekday down. Null until there are 8 weeks of data.
 */
function computeWeekdayWeights(daily, monthKeys) {
  const salesByDate = new Map(daily.map((day) => [day.date, day.sales]));
  const totals = Array(7).fill(0);
  const counts = Array(7).fill(0);

  for (const key of monthKeys) {
    for (const dateKey of dateKeysOfMonth(key)) {
      const weekday = weekdayMondayFirst(dateKey);
      totals[weekday] += salesByDate.get(dateKey) ?? 0;
      counts[weekday] += 1;
    }
  }

  const dayCount = counts.reduce((sum, count) => sum + count, 0);
  if (dayCount < MIN_DAYS_FOR_WEEKDAY_PROFILE) return null;

  const averages = totals.map((total, index) => (counts[index] ? total / counts[index] : 0));
  const overall = averages.reduce((sum, value) => sum + value, 0) / 7;
  if (overall <= 0) return null;
  return averages.map((value) => Number((value / overall).toFixed(4)));
}

/**
 * How the current month is tracking: sales recorded up to yesterday against
 * the share of the projected total that would normally be in by now, using
 * the weekday profile (a month that started on a weekend is front-loaded).
 */
function computePacing({ daily, monthKey: currentKey, today, projectedSales, weekdayWeights }) {
  const todayDay = Number(today.slice(8, 10));
  const daysElapsed = todayDay - 1;
  const totalDays = daysInMonth(currentKey);

  if (daysElapsed < MIN_DAYS_FOR_PACING || !(projectedSales > 0)) {
    return { status: 'too_early', daysElapsed, daysInMonth: totalDays };
  }

  const weights = weekdayWeights ?? Array(7).fill(1);
  const dates = dateKeysOfMonth(currentKey);
  const weightOf = (dateKey) => weights[weekdayMondayFirst(dateKey)];
  const monthWeight = dates.reduce((sum, dateKey) => sum + weightOf(dateKey), 0);
  const elapsedWeight = dates
    .slice(0, daysElapsed)
    .reduce((sum, dateKey) => sum + weightOf(dateKey), 0);
  const expectedShare = monthWeight > 0 ? elapsedWeight / monthWeight : daysElapsed / totalDays;

  const salesSoFar = daily
    .filter((day) => day.date.startsWith(currentKey) && day.date < today)
    .reduce((sum, day) => sum + day.sales, 0);
  const expectedSoFar = projectedSales * expectedShare;
  const ratio = expectedSoFar > 0 ? salesSoFar / expectedSoFar : null;

  let status = 'on_track';
  if (ratio != null && ratio >= 1 + PACING_TOLERANCE) status = 'ahead';
  if (ratio != null && ratio <= 1 - PACING_TOLERANCE) status = 'behind';

  return {
    status,
    daysElapsed,
    daysInMonth: totalDays,
    salesSoFar: round2(salesSoFar),
    expectedSoFar: round2(expectedSoFar),
    expectedShare: Number(expectedShare.toFixed(4)),
    ratio: ratio == null ? null : Number(ratio.toFixed(4)),
  };
}

module.exports = {
  findRecordingIssues,
  prepareTrainingSeries,
  computeWeekdayWeights,
  computePacing,
  weekdayMondayFirst,
  daysInMonth,
  median,
};
