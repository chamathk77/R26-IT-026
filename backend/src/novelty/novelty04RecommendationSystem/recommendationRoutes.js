const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { getRecommendationInsights } = require('./recommendationController');

const router = express.Router();

router.get('/insights', protect, getRecommendationInsights);

module.exports = router;
