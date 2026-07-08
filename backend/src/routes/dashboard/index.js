const express = require('express');
const authRoutes = require('./authRoutes');
const paymentsRoutes = require('./paymentsRoutes');
const trialCronReportRoutes = require('./trialCronReportRoutes');
const shopMngRoutes = require('./shopMngRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/payments', paymentsRoutes);
router.use('/trial-cron-reports', trialCronReportRoutes);
router.use('/shops', shopMngRoutes);

module.exports = router;
