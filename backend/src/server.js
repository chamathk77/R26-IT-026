require('dotenv').config();
const app = require('./app');
const config = require('./config');
const { connectDatabase } = require('./config/database');
const { startBillingCron } = require('./jobs/billingCron');
const { startTrialCron } = require('./jobs/trialCron');
const { startDueDaysCron } = require('./jobs/dueDaysCron');

async function start() {
  await connectDatabase();
  startTrialCron();
  startBillingCron();
  startDueDaysCron();
  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port} (${config.nodeEnv})`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
