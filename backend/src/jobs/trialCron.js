const cron = require('node-cron');
const { runDailyTrialExpirationCheck } = require('../services/trialExpirationService');

const DEFAULT_SCHEDULE = '0 0 * * *';
const DEFAULT_TIMEZONE = 'Asia/Colombo';

function isTrialCronEnabled() {
  return process.env.TRIAL_CRON_ENABLED !== 'false';
}

function getTrialCronSchedule() {
  return process.env.TRIAL_CRON_SCHEDULE || DEFAULT_SCHEDULE;
}

function getTrialCronTimezone() {
  return process.env.TRIAL_CRON_TIMEZONE || DEFAULT_TIMEZONE;
}

function startTrialCron() {
  if (!isTrialCronEnabled()) {
    console.log('[trial-cron] Disabled (TRIAL_CRON_ENABLED=false)');
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
      console.log('[trial-cron] Running scheduled trial expiration check...');
      try {
        await runDailyTrialExpirationCheck();
      } catch (error) {
        console.error('[trial-cron] Scheduled run failed:', error.message);
      }
    },
    { timezone },
  );

  console.log(
    `[trial-cron] Started — schedule "${schedule}" (${timezone}, daily midnight by default)`,
  );

  return task;
}

module.exports = {
  startTrialCron,
  runDailyTrialExpirationCheck,
};
