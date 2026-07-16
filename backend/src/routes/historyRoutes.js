const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createHistory,
  getHistory,
  totalSalesBranch_loggedUser_Dashboard,
  getAllSalesSummary_forDashboard,
  reversedSalesData,
  resendBillSms,
} = require('../controllers/historyController');

const router = express.Router();

router.post('/', protect, createHistory);
router.post('/checkout', protect, createHistory);
router.post('/:id/reverse', protect, reversedSalesData);
router.post('/:id/resend-bill', protect, resendBillSms);
router.get(
  '/stats/dashboard/branch-logged-user',
  protect,
  totalSalesBranch_loggedUser_Dashboard,
);
router.get(
  '/stats/dashboard/all-sales-summary',
  protect,
  getAllSalesSummary_forDashboard,
);
router.get('/', protect, getHistory);

module.exports = router;
