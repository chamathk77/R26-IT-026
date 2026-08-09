const express = require('express');
const { protectDashboard } = require('../../middleware/dashboardAuthMiddleware');
const {
  getSmsPayments,
  getSmsPaymentDetails,
  approveSmsBill,
  rejectSmsBill,
  resetAndApproveSmsBill,
} = require('../../controllers/dashboard/smsBillingAdminController');

const router = express.Router();

router.get('/', protectDashboard, getSmsPayments);
router.post('/:paymentId/approve', protectDashboard, approveSmsBill);
router.post('/:paymentId/reject', protectDashboard, rejectSmsBill);
router.post('/:paymentId/reset-and-approve', protectDashboard, resetAndApproveSmsBill);
router.get('/:paymentId', protectDashboard, getSmsPaymentDetails);

module.exports = router;
