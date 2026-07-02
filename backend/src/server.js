require('dotenv').config();
const app = require('./app');
const config = require('./config');
const { connectDatabase } = require('./config/database');
const { startDailyCron } = require('./jobs/dailyCron');

async function start() {
  await connectDatabase();
  startDailyCron();
  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port} (${config.nodeEnv})`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
