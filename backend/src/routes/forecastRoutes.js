const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getNextMonthForecast, getForecastAccuracy, getMonthlySeries } = require('../controllers/forecastController');

const router = express.Router();

router.get('/next-month', protect, getNextMonthForecast);
router.get('/accuracy', protect, getForecastAccuracy);
router.get('/series', protect, getMonthlySeries);

module.exports = router;
