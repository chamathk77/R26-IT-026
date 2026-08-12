const express = require('express');
const { protectDashboard } = require('../../middleware/dashboardAuthMiddleware');
const {
  listTrialCronReports,
  getTrialCronReport,
} = require('../../controllers/dashboard/trialCronReportController');

const router = express.Router();

router.get('/', protectDashboard, listTrialCronReports);
router.get('/:reportKey', protectDashboard, getTrialCronReport);

module.exports = router;
