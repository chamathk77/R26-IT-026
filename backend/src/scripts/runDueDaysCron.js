/**
 * Manually run subscription due-days cron.
 * Usage: npm run cron:due-days
 */
require('dotenv').config();

const { connectDatabase } = require('../config/database');
const { runDailyDueDaysCheck } = require('../services/paymentDueCheckService');

async function main() {
  await connectDatabase();
  console.log('[manual] Running runDailyDueDaysCheck...');
  const report = await runDailyDueDaysCheck({
    schedule: 'manual',
    timezone: process.env.DUE_DAYS_CRON_TIMEZONE || 'Asia/Colombo',
  });
  console.log('[manual] Done.');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error('[manual] Failed:', error);
  process.exit(1);
});
