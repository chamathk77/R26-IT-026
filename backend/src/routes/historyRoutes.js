const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createHistory,
  getHistory,
  getTodayStats,
} = require('../controllers/historyController');

const router = express.Router();

router.post('/', protect, createHistory);
router.post('/checkout', protect, createHistory);
router.get('/stats/today', protect, getTodayStats);
router.get('/', protect, getHistory);

module.exports = router;
