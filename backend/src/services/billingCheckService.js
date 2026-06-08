const ShopsData = require('../models/shopsData');

const REMINDER_DAYS_BEFORE = 7;

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(fromDate, toDate) {
  const ms = startOfDay(toDate).getTime() - startOfDay(fromDate).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function buildShopEntry(shop, today) {
  const nextPaymentDate = startOfDay(shop.nextPaymentDate);
  const daysUntilDue = daysUntil(today, nextPaymentDate);

  return {
    shopId: shop.shopId,
    shopName: shop.shopName,
    status: shop.status,
    nextPaymentDate: shop.nextPaymentDate,
    subAmount: shop.subAmount ?? null,
    dueDays: shop.dueDays ?? 0,
    daysUntilDue,
  };
}

/**
 * Checks every shop with a nextPaymentDate and groups them by billing urgency.
 * Phase 1: list/log only (no status updates or notifications yet).
 */
async function runDailyBillingCheck() {
  const today = startOfDay();

  const shops = await ShopsData.find({
    nextPaymentDate: { $ne: null },
  })
    .select(
      'shopId shopName status nextPaymentDate subAmount dueDays subscriptionStartDate',
    )
    .sort({ nextPaymentDate: 1 })
    .lean();

  const report = {
    checkedAt: new Date().toISOString(),
    today: today.toISOString(),
    totalShopsWithNextPaymentDate: shops.length,
    dueToday: [],
    dueWithinReminderWindow: [],
    overdue: [],
    upcoming: [],
  };

  for (const shop of shops) {
    const entry = buildShopEntry(shop, today);

    if (entry.daysUntilDue < 0) {
      report.overdue.push({
        ...entry,
        daysOverdue: Math.abs(entry.daysUntilDue),
      });
      continue;
    }

    if (entry.daysUntilDue === 0) {
      report.dueToday.push(entry);
      continue;
    }

    if (entry.daysUntilDue <= REMINDER_DAYS_BEFORE) {
      report.dueWithinReminderWindow.push(entry);
      continue;
    }

    report.upcoming.push(entry);
  }

  console.log('[billing-cron] Daily next payment date check');
  console.log(
    `[billing-cron] Summary: total=${report.totalShopsWithNextPaymentDate}, ` +
      `dueToday=${report.dueToday.length}, ` +
      `dueWithin${REMINDER_DAYS_BEFORE}Days=${report.dueWithinReminderWindow.length}, ` +
      `overdue=${report.overdue.length}, ` +
      `upcoming=${report.upcoming.length}`,
  );

  if (report.dueToday.length > 0) {
    console.log('[billing-cron] Due today:', report.dueToday);
  }

  if (report.dueWithinReminderWindow.length > 0) {
    console.log(
      '[billing-cron] Due within reminder window:',
      report.dueWithinReminderWindow,
    );
  }

  if (report.overdue.length > 0) {
    console.log('[billing-cron] Overdue:', report.overdue);
  }

  return report;
}

module.exports = {
  REMINDER_DAYS_BEFORE,
  runDailyBillingCheck,
};
