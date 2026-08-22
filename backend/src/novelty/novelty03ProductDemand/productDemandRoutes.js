const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { getProductDemandForecast } = require('./productDemandController');

const router = express.Router();

router.get('/forecast', protect, getProductDemandForecast);

module.exports = router;
