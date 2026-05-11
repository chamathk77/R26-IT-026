const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  checkoutCart,
  getTodayStats,
  getHistory,
} = require('../controllers/historyController');

const router = express.Router();

router.post('/checkout', protect, checkoutCart);
router.get('/stats/today', protect, getTodayStats);
router.get('/', protect, getHistory);

module.exports = router;
