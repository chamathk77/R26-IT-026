/**
 * Manually run subscription billing cron.
 * Usage: npm run cron:billing
 */
require('dotenv').config();

const { connectDatabase } = require('../config/database');
const { runDailyBillingCheck } = require('../services/billingCheckService');

async function main() {
  await connectDatabase();
  console.log('[manual] Running runDailyBillingCheck...');
  const report = await runDailyBillingCheck({
    schedule: 'manual',
    timezone: process.env.BILLING_CRON_TIMEZONE || 'Asia/Colombo',
  });
  console.log('[manual] Done.');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error('[manual] Failed:', error);
  process.exit(1);
});
