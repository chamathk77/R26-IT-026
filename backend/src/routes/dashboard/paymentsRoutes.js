const express = require('express');
const { protectDashboard } = require('../../middleware/dashboardAuthMiddleware');
const {
  listPendingPayments,
  getPaymentDetails,
  approveUpfrontPayment,
  rejectUpfrontPayment,
} = require('../../controllers/dashboard/paymentsAdminController');

const router = express.Router();

router.get('/pending', protectDashboard, listPendingPayments);
router.get('/:paymentId', protectDashboard, getPaymentDetails);
router.post('/:paymentId/approve-upfront', protectDashboard, approveUpfrontPayment);
router.post('/:paymentId/reject-upfront', protectDashboard, rejectUpfrontPayment);

module.exports = router;
