const express = require('express');
const authRoutes = require('./authRoutes');
const paymentsRoutes = require('./paymentsRoutes');
const trialCronReportRoutes = require('./trialCronReportRoutes');
const shopMngRoutes = require('./shopMngRoutes');
const smsBillingRoutes = require('./smsBillingRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/payments', paymentsRoutes);
router.use('/sms-billing', smsBillingRoutes);
router.use('/trial-cron-reports', trialCronReportRoutes);
router.use('/shops', shopMngRoutes);

module.exports = router;
