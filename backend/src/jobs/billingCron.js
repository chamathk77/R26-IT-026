const cron = require('node-cron');
const { runDailyBillingCheck } = require('../services/billingCheckService');

const DEFAULT_SCHEDULE = '0 0 * * *';
const DEFAULT_TIMEZONE = 'Asia/Colombo';

function isBillingCronEnabled() {
  return process.env.BILLING_CRON_ENABLED !== 'false';
}

function getBillingCronSchedule() {
  return process.env.BILLING_CRON_SCHEDULE || DEFAULT_SCHEDULE;
}

function getBillingCronTimezone() {
  return process.env.BILLING_CRON_TIMEZONE || DEFAULT_TIMEZONE;
}

function startBillingCron() {
  if (!isBillingCronEnabled()) {
    console.log('[billing-cron] Disabled (BILLING_CRON_ENABLED=false)');
    return null;
  }

  const schedule = getBillingCronSchedule();
  const timezone = getBillingCronTimezone();

  if (!cron.validate(schedule)) {
    console.error(`[billing-cron] Invalid schedule: "${schedule}"`);
    return null;
  }

  const task = cron.schedule(
    schedule,
    async () => {x
      console.log('[billing-cron] Running scheduled next payment check...');
      try {
        await runDailyBillingCheck();
      } catch (error) {
        console.error('[billing-cron] Scheduled run failed:', error.message);
      }
    },
    { timezone },
  );

  console.log(
    `[billing-cron] Started — schedule "${schedule}" (${timezone}, daily midnight by default)`,
  );

  return task;
}

module.exports = {
  startBillingCron,
  runDailyBillingCheck,
};
