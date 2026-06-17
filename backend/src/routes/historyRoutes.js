const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createHistory,
  getHistory,
  getTodayStats,
  reversedSalesData,
  resendBillSms,
} = require('../controllers/historyController');

const router = express.Router();

router.post('/', protect, createHistory);
router.post('/checkout', protect, createHistory);
router.post('/:id/reverse', protect, reversedSalesData);
router.post('/:id/resend-bill', protect, resendBillSms);
router.get('/stats/today', protect, getTodayStats);
router.get('/', protect, getHistory);

module.exports = router;
