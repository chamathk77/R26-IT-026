const cron = require('node-cron');
const { runDailyTrialExpirationCheck } = require('../services/trialExpirationService');
const { runDailyBillingCheck } = require('../services/billingCheckService');

const DEFAULT_SCHEDULE = '0 0 * * *';
const DEFAULT_TIMEZONE = 'Asia/Colombo';

function isTrialCronEnabled() {
  return process.env.TRIAL_CRON_ENABLED !== 'false';
}

function isBillingCronEnabled() {
  return process.env.BILLING_CRON_ENABLED !== 'false';
}

function getTrialCronSchedule() {
  return process.env.TRIAL_CRON_SCHEDULE || DEFAULT_SCHEDULE;
}

function getTrialCronTimezone() {
  return process.env.TRIAL_CRON_TIMEZONE || DEFAULT_TIMEZONE;
}

async function runMidnightDailyJobs({ schedule, timezone }) {
  const meta = { schedule, timezone };

  if (isTrialCronEnabled()) {
    console.log(
      '[trial-cron] Running scheduled trial expiration check (status=trial, trailEndDate passed)...',
    );
    try {
      await runDailyTrialExpirationCheck(meta);
    } catch (error) {
      console.error('[trial-cron] Scheduled run failed:', error.message);
    }
  }

  if (isBillingCronEnabled()) {
    console.log('[billing-cron] Running subscription invoice generation (after trial cron)...');
    try {
      await runDailyBillingCheck(meta);
    } catch (error) {
      console.error('[billing-cron] Scheduled run failed:', error.message);
    }
  }
}

function startTrialCron() {
  const trialEnabled = isTrialCronEnabled();
  const billingEnabled = isBillingCronEnabled();

  if (!trialEnabled && !billingEnabled) {
    console.log('[daily-cron] Disabled (TRIAL_CRON_ENABLED=false and BILLING_CRON_ENABLED=false)');
    return null;
  }

  if (!trialEnabled && billingEnabled) {
    console.log('[trial-cron] Disabled — billing cron will schedule independently');
    return null;
  }

  const schedule = getTrialCronSchedule();
  const timezone = getTrialCronTimezone();

  if (!cron.validate(schedule)) {
    console.error(`[trial-cron] Invalid schedule: "${schedule}"`);
    return null;
  }

  const task = cron.schedule(
    schedule,
    async () => {
      await runMidnightDailyJobs({ schedule, timezone });
    },
    { timezone },
  );

  const billingNote = billingEnabled
    ? ', then billing invoices'
    : ' (billing cron disabled)';

  console.log(
    `[trial-cron] Started — schedule "${schedule}" (${timezone}, daily midnight). ` +
      `Runs trial expiration${billingNote}.`,
  );

  return task;
}

module.exports = {
  startTrialCron,
  runDailyTrialExpirationCheck,
  runMidnightDailyJobs,
};
