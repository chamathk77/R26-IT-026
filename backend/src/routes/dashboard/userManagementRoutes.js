const express = require('express');
const { protectDashboard } = require('../../middleware/dashboardAuthMiddleware');
const {
  getDashboardUsers,
  getDashboardUserDetails,
  createDashboardUser,
  updateDashboardUser,
  deleteDashboardUser,
} = require('../../controllers/dashboard/userManagementController');

const router = express.Router();

router.get('/', protectDashboard, getDashboardUsers);
router.post('/', protectDashboard, createDashboardUser);
router.get('/:userId', protectDashboard, getDashboardUserDetails);
router.put('/:userId', protectDashboard, updateDashboardUser);
router.delete('/:userId', protectDashboard, deleteDashboardUser);

module.exports = router;
