/**
 * Turns the history and the forecast into short plain-language sentences for
 * shop owners: trend, busiest season, best weekday, break-even and loss risk.
 * Every sentence is computed from the shop's own numbers; a sentence is left
 * out when there is not enough history to back it.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const LOSS_WARNING_PROBABILITY = 0.2;
const LOSS_UNLIKELY_PROBABILITY = 0.05;

function formatCurrency(value) {
  return `Rs. ${Math.round(value).toLocaleString('en-LK')}`;
}

function formatPercentChange(ratio) {
  const percent = Math.round((ratio - 1) * 100);
  return `${percent >= 0 ? '+' : '−'}${Math.abs(percent)}%`;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function trendInsight(sales) {
  const n = sales.length;
  if (n >= 15) {
    const recent = sum(sales.slice(n - 3));
    const yearAgo = sum(sales.slice(n - 15, n - 12));
    if (yearAgo <= 0) return null;
    const ratio = recent / yearAgo;
    const percent = Math.round(Math.abs(ratio - 1) * 100);
    return {
      key: 'trend',
      tone: ratio >= 1 ? 'positive' : 'negative',
      text:
        percent === 0
          ? 'Sales over the last 3 months are level with the same months last year.'
          : `Sales over the last 3 months are ${ratio >= 1 ? 'up' : 'down'} ${percent}% on the same months last year.`,
    };
  }
  if (n >= 6) {
    const recent = sum(sales.slice(n - 3));
    const before = sum(sales.slice(n - 6, n - 3));
    if (before <= 0) return null;
    const ratio = recent / before;
    const percent = Math.round(Math.abs(ratio - 1) * 100);
    return {
      key: 'trend',
      tone: ratio >= 1 ? 'positive' : 'negative',
      text: `Sales over the last 3 months are ${ratio >= 1 ? 'up' : 'down'} ${percent}% on the 3 months before (part of this can be the normal seasonal swing).`,
    };
  }
  return null;
}

/**
 * Average ratio of each calendar month to its centred 12-month moving average
 * (classical decomposition). Needs two years so every month is seen once.
 */
function seasonalityInsight(monthKeys, sales) {
  const n = sales.length;
  if (n < 24) return null;

  const ratios = new Map();
  for (let i = 6; i <= n - 7; i += 1) {
    const window = 0.5 * sales[i - 6] + sum(sales.slice(i - 5, i + 6)) + 0.5 * sales[i + 6];
    const centred = window / 12;
    if (centred <= 0) continue;
    const calendarMonth = Number(monthKeys[i].slice(5, 7)) - 1;
    const list = ratios.get(calendarMonth) ?? [];
    list.push(sales[i] / centred);
    ratios.set(calendarMonth, list);
  }
  if (ratios.size < 12) return null;

  const averages = [...ratios.entries()].map(([month, list]) => [month, sum(list) / list.length]);
  averages.sort((a, b) => b[1] - a[1]);
  const [bestMonth, bestRatio] = averages[0];
  const [worstMonth, worstRatio] = averages[averages.length - 1];
  return {
    key: 'seasonality',
    tone: 'neutral',
    text: `${MONTH_NAMES[bestMonth]} is usually your busiest month (${formatPercentChange(bestRatio)} on a typical month) and ${MONTH_NAMES[worstMonth]} the quietest (${formatPercentChange(worstRatio)}).`,
  };
}

function weekdayInsight(weekdayWeights) {
  if (!weekdayWeights) return null;
  const ranked = weekdayWeights.map((weight, index) => [index, weight]).sort((a, b) => b[1] - a[1]);
  const [bestDay, bestWeight] = ranked[0];
  const [worstDay, worstWeight] = ranked[ranked.length - 1];
  const worstText =
    worstWeight < 0.15
      ? `you rarely sell on ${WEEKDAY_NAMES[worstDay]}s`
      : `${WEEKDAY_NAMES[worstDay]} is the weakest (${formatPercentChange(worstWeight)})`;
  return {
    key: 'weekday',
    tone: 'neutral',
    text: `${WEEKDAY_NAMES[bestDay]} is your strongest day (${formatPercentChange(bestWeight)} on an average day); ${worstText}. Months with more of your strong days are forecast higher.`,
  };
}

function breakEvenInsights(breakEven, nextMonth) {
  if (!breakEven?.available) return [];
  const insights = [
    {
      key: 'break_even',
      tone: 'neutral',
      text: `You need about ${formatCurrency(breakEven.breakEvenSales)} of sales a month to cover your costs (about ${formatCurrency(breakEven.fixedCosts)} fixed, plus ${Math.round(breakEven.variableCostRate * 100)}% of every sale).`,
    },
  ];
  if (nextMonth && breakEven.breakEvenSales > 0) {
    const ratio = nextMonth.sales.predicted / breakEven.breakEvenSales;
    const percent = Math.round(Math.abs(ratio - 1) * 100);
    insights.push({
      key: 'break_even_next_month',
      tone: ratio >= 1 ? 'positive' : 'warning',
      text:
        ratio >= 1
          ? `${nextMonth.label}'s sales forecast is ${percent}% above your break-even level.`
          : `${nextMonth.label}'s sales forecast is ${percent}% below your break-even level — costs may not be covered.`,
    });
  }
  return insights;
}

function lossRiskInsight(forecastMonths) {
  const nextThree = forecastMonths.slice(0, 3).filter((month) => month.profit.lossProbability != null);
  if (!nextThree.length) return null;
  const riskiest = nextThree.reduce((a, b) => (b.profit.lossProbability > a.profit.lossProbability ? b : a));
  if (riskiest.profit.lossProbability >= LOSS_WARNING_PROBABILITY) {
    return {
      key: 'loss_risk',
      tone: 'warning',
      text: `There is about a ${Math.round(riskiest.profit.lossProbability * 100)}% chance of a loss in ${riskiest.label}.`,
    };
  }
  if (riskiest.profit.lossProbability < LOSS_UNLIKELY_PROBABILITY) {
    return {
      key: 'loss_risk',
      tone: 'positive',
      text: 'A loss in any of the next 3 months is unlikely (under 5% chance each month).',
    };
  }
  return null;
}

function peakInsight(forecastMonths) {
  if (forecastMonths.length < 6) return null;
  const peak = forecastMonths.reduce((a, b) => (b.sales.predicted > a.sales.predicted ? b : a));
  return {
    key: 'peak_ahead',
    tone: 'neutral',
    text: `Busiest month ahead: ${peak.label}, with about ${formatCurrency(peak.sales.predicted)} in sales. Plan stock and staff early.`,
  };
}

function buildInsights({ monthKeys, sales, weekdayWeights, breakEven, forecastMonths }) {
  return [
    trendInsight(sales),
    seasonalityInsight(monthKeys, sales),
    weekdayInsight(weekdayWeights),
    ...breakEvenInsights(breakEven, forecastMonths[0]),
    lossRiskInsight(forecastMonths),
    peakInsight(forecastMonths),
  ].filter(Boolean);
}

module.exports = { buildInsights };
