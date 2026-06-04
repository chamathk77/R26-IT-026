const express = require('express');
const { protectDashboard } = require('../../middleware/dashboardAuthMiddleware');
const {
  listPendingPayments,
  getPaymentDetails,
  updatePaymentStatus,
} = require('../../controllers/dashboard/paymentsAdminController');

const router = express.Router();

router.get('/pending', protectDashboard, listPendingPayments);
router.get('/:paymentId', protectDashboard, getPaymentDetails);
router.post('/:paymentId/status', protectDashboard, updatePaymentStatus);

module.exports = router;
