const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { getSalesCostForecast } = require('./forecastController');

const router = express.Router();

router.get('/sales-cost', protect, getSalesCostForecast);

module.exports = router;
