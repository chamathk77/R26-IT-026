const express = require('express');
const authRoutes = require('./authRoutes');
const paymentsRoutes = require('./paymentsRoutes');
const trialCronReportRoutes = require('./trialCronReportRoutes');
const shopMngRoutes = require('./shopMngRoutes');
const smsBillingRoutes = require('./smsBillingRoutes');
const userManagementRoutes = require('./userManagementRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/payments', paymentsRoutes);
router.use('/manual-payment-confirmations', require('./manualPaymentConfirmationRoutes'));
router.use('/sms-billing', smsBillingRoutes);
router.use('/trial-cron-reports', trialCronReportRoutes);
router.use('/shops', shopMngRoutes);
router.use('/users', userManagementRoutes);

module.exports = router;
