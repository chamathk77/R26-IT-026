const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { getCustomerBehaviorInsights } = require('./behaviorController');

const router = express.Router();

router.get('/insights', protect, getCustomerBehaviorInsights);

module.exports = router;
