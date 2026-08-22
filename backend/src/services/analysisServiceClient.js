const axios = require('axios');
const config = require('../config');

const client = axios.create({
  baseURL: config.analysisServiceUrl,
  timeout: config.analysisServiceTimeoutMs,
});

async function requestForecast({ series, horizon, seasonLength }) {
  const response = await client.post('/forecast', { series, horizon, seasonLength });
  return response.data;
}

async function requestCustomerSegments({ customers, k, now }) {
  const response = await client.post('/segments', { customers, k, now });
  return response.data;
}

async function requestProductDemand({ products, horizonDays }) {
  const response = await client.post('/product-demand', { products, horizonDays });
  return response.data;
}

module.exports = {
  requestForecast,
  requestCustomerSegments,
  requestProductDemand,
};
