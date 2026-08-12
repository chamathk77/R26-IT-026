const express = require('express');
const { protectDashboard } = require('../../middleware/dashboardAuthMiddleware');
const {
  createManualPaymentConfirmation,
  listManualPaymentConfirmations,
  getManualPaymentConfirmation,
} = require('../../controllers/dashboard/manualPaymentConfirmationController');

const router = express.Router();

router.get('/', protectDashboard, listManualPaymentConfirmations);
router.post('/', protectDashboard, createManualPaymentConfirmation);
router.get('/:confirmationId', protectDashboard, getManualPaymentConfirmation);

module.exports = router;
