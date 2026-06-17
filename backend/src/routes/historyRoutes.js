const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createHistory,
  getHistory,
  getTodayStats,
  reversedSalesData,
} = require('../controllers/historyController');

const router = express.Router();

router.post('/', protect, createHistory);
router.post('/checkout', protect, createHistory);
router.post('/:id/reverse', protect, reversedSalesData);
router.get('/stats/today', protect, getTodayStats);
router.get('/', protect, getHistory);

module.exports = router;
