/**
 * Manually run all midnight daily crons in order:
 * trial → subscription billing → SMS billing → subscription due days → SMS due days
 *
 * Usage (from backend folder):
 *   npm run cron:daily
 *   node src/scripts/runDailyCrons.js
 */
require('dotenv').config();

const { connectDatabase } = require('../config/database');
const { runDailyTrialExpirationCheck } = require('../services/trialExpirationService');
const { runDailyBillingCheck } = require('../services/billingCheckService');
const { runDailySmsBillCheck } = require('../services/smsBillCronService');
const { runDailyDueDaysCheck } = require('../services/paymentDueCheckService');
const { runDailySmsDueDaysCheck } = require('../services/smsDueDaysCronService');

async function main() {
  await connectDatabase();

  const meta = {
    schedule: 'manual',
    timezone:
      process.env.TRIAL_CRON_TIMEZONE ||
      process.env.BILLING_CRON_TIMEZONE ||
      process.env.SMS_BILL_CRON_TIMEZONE ||
      process.env.DUE_DAYS_CRON_TIMEZONE ||
      process.env.SMS_DUE_DAYS_CRON_TIMEZONE ||
      'Asia/Colombo',
  };

  const jobs = [
    { name: 'trial expiration', run: runDailyTrialExpirationCheck },
    { name: 'subscription billing', run: runDailyBillingCheck },
    { name: 'SMS billing', run: runDailySmsBillCheck },
    { name: 'subscription due days', run: runDailyDueDaysCheck },
    { name: 'SMS due days', run: runDailySmsDueDaysCheck },
  ];

  const results = [];

  for (const job of jobs) {
    console.log(`[manual] Running ${job.name}...`);
    try {
      const report = await job.run(meta);
      results.push({ job: job.name, ok: true, report });
      console.log(`[manual] ${job.name} done.`);
    } catch (error) {
      results.push({ job: job.name, ok: false, error: error.message });
      console.error(`[manual] ${job.name} failed:`, error.message);
    }
  }

  console.log('[manual] All daily crons finished.');
  console.log(
    JSON.stringify(
      results.map((entry) => ({
        job: entry.job,
        ok: entry.ok,
        reportId: entry.report?.reportId ?? null,
        error: entry.error ?? null,
        summary: entry.report
          ? {
              totalShopsChecked: entry.report.totalShopsChecked,
              invoiced: entry.report.invoiced?.length,
              processed: entry.report.processed?.length,
              subscription: entry.report.subscription?.length,
              escalated: entry.report.escalated?.length,
              skipped: entry.report.skipped?.length,
              errors: entry.report.errors?.length,
            }
          : null,
      })),
      null,
      2,
    ),
  );

  const failed = results.some((entry) => !entry.ok);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error('[manual] Failed:', error);
  process.exit(1);
});
