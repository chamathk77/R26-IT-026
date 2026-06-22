const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  assignKpiHistorySalesPerson,
  getKpiHistoryByOrderId,
  getKpiHistorySummary,
  getKpiSummary,
} = require('../controllers/kpiController');

const router = express.Router();

router.get('/summary', protect, getKpiSummary);
router.get('/history-summary', protect, getKpiHistorySummary);
router.get('/history/:orderId', protect, getKpiHistoryByOrderId);
router.patch('/history/:orderId/sales-person', protect, assignKpiHistorySalesPerson);

module.exports = router;
