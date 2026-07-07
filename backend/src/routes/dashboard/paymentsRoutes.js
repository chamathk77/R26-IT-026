const express = require('express');
const { protectDashboard } = require('../../middleware/dashboardAuthMiddleware');
const {
  getOnboardingPayments,
  getSubscriptionPayments,
  getPaymentDetails,
  approveUpfrontPayment,
  approveSubscriptionPayment,
  resetAndApproveSubscriptionPayment,
  approveFirstMultiMonthSubscriptionPayment,
  rejectUpfrontPayment,
  rejectSubscriptionPayment,
  rejectFirstMultiMonthSubscriptionPayment,
} = require('../../controllers/dashboard/paymentsAdminController');

const router = express.Router();

router.get('/onboarding', protectDashboard, getOnboardingPayments);
router.get('/subscription', protectDashboard, getSubscriptionPayments);
router.get('/:paymentId', protectDashboard, getPaymentDetails);
router.post('/:paymentId/approve-upfront', protectDashboard, approveUpfrontPayment);
router.post(
  '/:paymentId/approve-first-multi-month-subscription',
  protectDashboard,
  approveFirstMultiMonthSubscriptionPayment,
);
router.post('/:paymentId/approve-subscription', protectDashboard, approveSubscriptionPayment);
router.post(
  '/:paymentId/reset-and-approve-subscription',
  protectDashboard,
  resetAndApproveSubscriptionPayment,
);
router.post('/:paymentId/reject-upfront', protectDashboard, rejectUpfrontPayment);
router.post(
  '/:paymentId/reject-first-multi-month-subscription',
  protectDashboard,
  rejectFirstMultiMonthSubscriptionPayment,
);
router.post('/:paymentId/reject-subscription', protectDashboard, rejectSubscriptionPayment);

module.exports = router;
