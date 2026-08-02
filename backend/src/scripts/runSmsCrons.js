/**
 * Manually run SMS billing + SMS due-days crons (same order as midnight dailyCron).
 *
 * Usage (from backend folder):
 *   node src/scripts/runSmsCrons.js
 *   npm run cron:sms
 */
require('dotenv').config();

const { connectDatabase } = require('../config/database');
const { runDailySmsBillCheck } = require('../services/smsBillCronService');
const { runDailySmsDueDaysCheck } = require('../services/smsDueDaysCronService');

async function main() {
  await connectDatabase();

  const timezone =
    process.env.SMS_BILL_CRON_TIMEZONE ||
    process.env.SMS_DUE_DAYS_CRON_TIMEZONE ||
    'Asia/Colombo';
  const meta = { schedule: 'manual', timezone };

  console.log('[manual] Running runDailySmsBillCheck...');
  const billReport = await runDailySmsBillCheck(meta);
  console.log('[manual] SMS bill done.');
  console.log(JSON.stringify(billReport, null, 2));

  console.log('[manual] Running runDailySmsDueDaysCheck...');
  const dueDaysReport = await runDailySmsDueDaysCheck(meta);
  console.log('[manual] SMS due days done.');
  console.log(JSON.stringify(dueDaysReport, null, 2));

  process.exit(0);
}

main().catch((error) => {
  console.error('[manual] Failed:', error);
  process.exit(1);
});
