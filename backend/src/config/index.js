module.exports = {
  port: Number(process.env.PORT) || 3000,
  env: String(process.env.ENV || 'DEV').trim().toUpperCase(),
};
