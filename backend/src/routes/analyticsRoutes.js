const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getAnalyticsOverview } = require('../controllers/analyticsController');

const router = express.Router();

router.get('/overview', protect, getAnalyticsOverview);

module.exports = router;
