const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const {
  getRecommendationInsights,
  getTemporalBundles,
} = require('./recommendationController');

const router = express.Router();

router.get('/insights', protect, getRecommendationInsights);
router.get('/bundles', protect, getTemporalBundles);

module.exports = router;
