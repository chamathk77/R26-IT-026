const cron = require('node-cron');
const { runDailyTrialExpirationCheck } = require('../services/trialExpirationService');
const { runDailyBillingCheck } = require('../services/billingCheckService');
const { runDailySmsBillCheck } = require('../services/smsBillCronService');
const { runDailyDueDaysCheck } = require('../services/paymentDueCheckService');
const { runDailySmsDueDaysCheck } = require('../services/smsDueDaysCronService');

const DEFAULT_SCHEDULE = '0 0 * * *';
const DEFAULT_TIMEZONE = 'Asia/Colombo';

function isTrialCronEnabled() {
  return process.env.TRIAL_CRON_ENABLED !== 'false';
}

function isBillingCronEnabled() {
  return process.env.BILLING_CRON_ENABLED !== 'false';
}

function isSmsBillCronEnabled() {
  return process.env.SMS_BILL_CRON_ENABLED !== 'false';
}

function isDueDaysCronEnabled() {
  return process.env.DUE_DAYS_CRON_ENABLED !== 'false';
}

function isSmsDueDaysCronEnabled() {
  return process.env.SMS_DUE_DAYS_CRON_ENABLED !== 'false';
}

function isAnyDailyCronEnabled() {
  return (
    isTrialCronEnabled() ||
    isBillingCronEnabled() ||
    isSmsBillCronEnabled() ||
    isDueDaysCronEnabled() ||
    isSmsDueDaysCronEnabled()
  );
}

function getDailyCronSchedule() {
  if (isTrialCronEnabled()) {
    return process.env.TRIAL_CRON_SCHEDULE || DEFAULT_SCHEDULE;
  }
  if (isBillingCronEnabled()) {
    return process.env.BILLING_CRON_SCHEDULE || DEFAULT_SCHEDULE;
  }
  if (isDueDaysCronEnabled()) {
    return process.env.DUE_DAYS_CRON_SCHEDULE || DEFAULT_SCHEDULE;
  }
  return process.env.SMS_DUE_DAYS_CRON_SCHEDULE || DEFAULT_SCHEDULE;
}

function getDailyCronTimezone() {
  if (isTrialCronEnabled()) {
    return process.env.TRIAL_CRON_TIMEZONE || DEFAULT_TIMEZONE;
  }
  if (isBillingCronEnabled()) {
    return process.env.BILLING_CRON_TIMEZONE || DEFAULT_TIMEZONE;
  }
  if (isDueDaysCronEnabled()) {
    return process.env.DUE_DAYS_CRON_TIMEZONE || DEFAULT_TIMEZONE;
  }
  return process.env.SMS_DUE_DAYS_CRON_TIMEZONE || DEFAULT_TIMEZONE;
}

function describeEnabledJobs() {
  const jobs = [];
  if (isTrialCronEnabled()) {
    jobs.push('trial expiration');
  }
  if (isBillingCronEnabled()) {
    jobs.push('subscription billing');
  }
  if (isSmsBillCronEnabled()) {
    jobs.push('SMS billing');
  }
  if (isDueDaysCronEnabled()) {
    jobs.push('subscription due days');
  }
  if (isSmsDueDaysCronEnabled()) {
    jobs.push('SMS due days');
  }
  return jobs.join(', then ');
}

async function runMidnightDailyJobs(meta = {}) {
  if (isTrialCronEnabled()) {
    console.log(
      '[daily-cron] Running trial expiration check (status=trial, trailEndDate passed)...',
    );
    try {
      await runDailyTrialExpirationCheck(meta);
    } catch (error) {
      console.error('[daily-cron] Trial expiration failed:', error.message);
    }
  }

  if (isBillingCronEnabled()) {
    console.log('[daily-cron] Running subscription invoice generation...');
    try {
      await runDailyBillingCheck(meta);
    } catch (error) {
      console.error('[daily-cron] Subscription billing failed:', error.message);
    }
  }

  if (isSmsBillCronEnabled()) {
    console.log('[daily-cron] Running SMS billing invoice generation...');
    try {
      await runDailySmsBillCheck(meta);
    } catch (error) {
      console.error('[daily-cron] SMS billing failed:', error.message);
    }
  }

  if (isDueDaysCronEnabled()) {
    console.log('[daily-cron] Running subscription due days check...');
    try {
      await runDailyDueDaysCheck(meta);
    } catch (error) {
      console.error('[daily-cron] Due days check failed:', error.message);
    }
  }

  if (isSmsDueDaysCronEnabled()) {
    console.log('[daily-cron] Running SMS due days check...');
    try {
      await runDailySmsDueDaysCheck(meta);
    } catch (error) {
      console.error('[daily-cron] SMS due days check failed:', error.message);
    }
  }
}

function startDailyCron() {
  if (!isAnyDailyCronEnabled()) {
    console.log(
      '[daily-cron] Disabled (TRIAL_CRON_ENABLED, BILLING_CRON_ENABLED, SMS_BILL_CRON_ENABLED, DUE_DAYS_CRON_ENABLED, and SMS_DUE_DAYS_CRON_ENABLED are all false)',
    );
    return null;
  }

  const schedule = getDailyCronSchedule();
  const timezone = getDailyCronTimezone();

  if (!cron.validate(schedule)) {
    console.error(`[daily-cron] Invalid schedule: "${schedule}"`);
    return null;
  }

  const task = cron.schedule(
    schedule,
    async () => {
      await runMidnightDailyJobs({ schedule, timezone });
    },
    { timezone },
  );

  console.log(
    `[daily-cron] Started — schedule "${schedule}" (${timezone}). Runs: ${describeEnabledJobs()}.`,
  );

  return task;
}

module.exports = {
  startDailyCron,
  runMidnightDailyJobs,
  isTrialCronEnabled,
  isBillingCronEnabled,
  isSmsBillCronEnabled,
  isDueDaysCronEnabled,
  isSmsDueDaysCronEnabled,
};
