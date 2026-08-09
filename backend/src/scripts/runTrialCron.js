/**
 * Manually run trial expiration cron.
 * Usage: npm run cron:trial
 */
require('dotenv').config();

const { connectDatabase } = require('../config/database');
const { runDailyTrialExpirationCheck } = require('../services/trialExpirationService');

async function main() {
  await connectDatabase();
  console.log('[manual] Running runDailyTrialExpirationCheck...');
  const report = await runDailyTrialExpirationCheck({
    schedule: 'manual',
    timezone: process.env.TRIAL_CRON_TIMEZONE || 'Asia/Colombo',
  });
  console.log('[manual] Done.');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error('[manual] Failed:', error);
  process.exit(1);
});
