const express = require('express');
const { protectDashboard } = require('../../middleware/dashboardAuthMiddleware');
const {
  listPendingPayments,
  getPaymentDetails,
  approveUpfrontPayment,
  approveSubscriptionPayment,
  approveFirstMultiMonthSubscriptionPayment,
  rejectUpfrontPayment,
  rejectSubscriptionPayment,
  rejectFirstMultiMonthSubscriptionPayment,
} = require('../../controllers/dashboard/paymentsAdminController');

const router = express.Router();

router.get('/pending', protectDashboard, listPendingPayments);
router.get('/:paymentId', protectDashboard, getPaymentDetails);
router.post('/:paymentId/approve-upfront', protectDashboard, approveUpfrontPayment);
router.post(
  '/:paymentId/approve-first-multi-month-subscription',
  protectDashboard,
  approveFirstMultiMonthSubscriptionPayment,
);
router.post('/:paymentId/approve-subscription', protectDashboard, approveSubscriptionPayment);
router.post('/:paymentId/reject-upfront', protectDashboard, rejectUpfrontPayment);
router.post(
  '/:paymentId/reject-first-multi-month-subscription',
  protectDashboard,
  rejectFirstMultiMonthSubscriptionPayment,
);
router.post('/:paymentId/reject-subscription', protectDashboard, rejectSubscriptionPayment);

module.exports = router;
