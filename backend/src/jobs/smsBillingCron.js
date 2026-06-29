const cron = require('node-cron');
const { runDailySmsBillingCheck } = require('../services/smsBillingCheckService');
const { runDailyDueDaysCheck } = require('../services/paymentDueCheckService');
const { isDueDaysCronEnabled } = require('./dueDaysCron');

const DEFAULT_SCHEDULE = '0 0 * * *';
const DEFAULT_TIMEZONE = 'Asia/Colombo';

function isSmsBillingCronEnabled() {
  return process.env.SMS_BILLING_CRON_ENABLED !== 'false';
}

function isTrialCronEnabled() {
  return process.env.TRIAL_CRON_ENABLED !== 'false';
}

function isBillingCronEnabled() {
  return process.env.BILLING_CRON_ENABLED !== 'false';
}

function getSmsBillingCronSchedule() {
  return process.env.SMS_BILLING_CRON_SCHEDULE || DEFAULT_SCHEDULE;
}

function getSmsBillingCronTimezone() {
  return process.env.SMS_BILLING_CRON_TIMEZONE || DEFAULT_TIMEZONE;
}

function startSmsBillingCron() {
  if (!isSmsBillingCronEnabled()) {
    console.log('[sms-billing-cron] Disabled (SMS_BILLING_CRON_ENABLED=false)');
    return null;
  }

  if (isTrialCronEnabled() || isBillingCronEnabled()) {
    console.log(
      '[sms-billing-cron] Chained to daily cron — runs right after subscription billing',
    );
    return null;
  }

  const schedule = getSmsBillingCronSchedule();
  const timezone = getSmsBillingCronTimezone();

  if (!cron.validate(schedule)) {
    console.error(`[sms-billing-cron] Invalid schedule: "${schedule}"`);
    return null;
  }

  const task = cron.schedule(
    schedule,
    async () => {
      console.log('[sms-billing-cron] Running scheduled SMS invoice generation...');
      try {
        await runDailySmsBillingCheck({
          schedule,
          timezone,
        });

        if (isDueDaysCronEnabled()) {
          console.log('[due-days-cron] Running due days check (after SMS billing)...');
          await runDailyDueDaysCheck({
            schedule,
            timezone,
          });
        }
      } catch (error) {
        console.error('[sms-billing-cron] Scheduled run failed:', error.message);
      }
    },
    { timezone },
  );

  console.log(
    `[sms-billing-cron] Started — schedule "${schedule}" (${timezone}, daily midnight by default)`,
  );

  return task;
}

module.exports = {
  startSmsBillingCron,
  runDailySmsBillingCheck,
  isSmsBillingCronEnabled,
};
