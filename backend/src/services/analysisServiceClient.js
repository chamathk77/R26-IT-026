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

async function requestSalesCostForecast(payload) {
  const response = await client.post('/forecast/sales-cost', payload);
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

async function requestRecommendations(payload) {
  const response = await client.post('/recommendations', payload);
  return response.data;
}

async function requestTemporalBundles(payload) {
  const response = await client.post('/temporal-bundles', payload);
  return response.data;
}

module.exports = {
  requestForecast,
  requestSalesCostForecast,
  requestCustomerSegments,
  requestProductDemand,
  requestRecommendations,
  requestTemporalBundles,
};
