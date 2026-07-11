/**
 * Manually run SMS billing cron for testing.
 *
 * Usage (from backend folder):
 *   node src/scripts/runSmsBillCron.js
 */
require('dotenv').config();

const { connectDatabase } = require('../config/database');
const { runDailySmsBillCheck } = require('../services/smsBillCronService');

async function main() {
  await connectDatabase();

  console.log('[manual] Running runDailySmsBillCheck...');
  const report = await runDailySmsBillCheck({
    schedule: 'manual',
    timezone: process.env.SMS_BILL_CRON_TIMEZONE || 'Asia/Colombo',
  });

  console.log('[manual] Done.');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error('[manual] Failed:', error);
  process.exit(1);
});
