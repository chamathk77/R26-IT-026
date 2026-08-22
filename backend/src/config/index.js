module.exports = {
  port: Number(process.env.PORT) || 3000,
  env: String(process.env.ENV || 'DEV').trim().toUpperCase(),
  analysisServiceUrl: process.env.ANALYSIS_SERVICE_URL || 'http://127.0.0.1:8000',
  analysisServiceTimeoutMs: Number(process.env.ANALYSIS_SERVICE_TIMEOUT_MS) || 25000,
};
