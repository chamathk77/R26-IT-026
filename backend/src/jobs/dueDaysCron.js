const cron = require('node-cron');
const { runDailyDueDaysCheck } = require('../services/paymentDueCheckService');

const DEFAULT_SCHEDULE = '0 0 * * *';
const DEFAULT_TIMEZONE = 'Asia/Colombo';

function isDueDaysCronEnabled() {
  return process.env.DUE_DAYS_CRON_ENABLED !== 'false';
}

function isTrialCronEnabled() {
  return process.env.TRIAL_CRON_ENABLED !== 'false';
}

function isBillingCronEnabled() {
  return process.env.BILLING_CRON_ENABLED !== 'false';
}

function isDueDaysCronChained() {
  return isTrialCronEnabled() || isBillingCronEnabled();
}

function getDueDaysCronSchedule() {
  return process.env.DUE_DAYS_CRON_SCHEDULE || DEFAULT_SCHEDULE;
}

function getDueDaysCronTimezone() {
  return process.env.DUE_DAYS_CRON_TIMEZONE || DEFAULT_TIMEZONE;
}

function startDueDaysCron() {
  if (!isDueDaysCronEnabled()) {
    console.log('[due-days-cron] Disabled (DUE_DAYS_CRON_ENABLED=false)');
    return null;
  }

  if (isDueDaysCronChained()) {
    console.log(
      '[due-days-cron] Chained to daily cron — runs after subscription billing',
    );
    return null;
  }

  const schedule = getDueDaysCronSchedule();
  const timezone = getDueDaysCronTimezone();

  if (!cron.validate(schedule)) {
    console.error(`[due-days-cron] Invalid schedule: "${schedule}"`);
    return null;
  }

  const task = cron.schedule(
    schedule,
    async () => {
      console.log('[due-days-cron] Running scheduled due days check...');
      try {
        await runDailyDueDaysCheck({
          schedule,
          timezone,
        });
      } catch (error) {
        console.error('[due-days-cron] Scheduled run failed:', error.message);
      }
    },
    { timezone },
  );

  console.log(
    `[due-days-cron] Started — schedule "${schedule}" (${timezone}, daily midnight by default)`,
  );

  return task;
}

module.exports = {
  startDueDaysCron,
  runDailyDueDaysCheck,
  isDueDaysCronEnabled,
};
