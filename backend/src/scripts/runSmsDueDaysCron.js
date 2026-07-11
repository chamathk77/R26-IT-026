/**
 * Manually run SMS due-days cron for testing.
 *
 * Usage (from backend folder):
 *   node src/scripts/runSmsDueDaysCron.js
 */
require('dotenv').config();

const { connectDatabase } = require('../config/database');
const { runDailySmsDueDaysCheck } = require('../services/smsDueDaysCronService');

async function main() {
  await connectDatabase();

  console.log('[manual] Running runDailySmsDueDaysCheck...');
  const report = await runDailySmsDueDaysCheck({
    schedule: 'manual',
    timezone: process.env.SMS_DUE_DAYS_CRON_TIMEZONE || 'Asia/Colombo',
  });

  console.log('[manual] Done.');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error('[manual] Failed:', error);
  process.exit(1);
});
