const express = require('express');
const {
  internalLogin,
  internalSignup,
  internalLogout,
} = require('../../controllers/dashboard/internalAuthController');
const {
  protectDashboard,
  requireDashboardAdmin,
} = require('../../middleware/dashboardAuthMiddleware');

const router = express.Router();

router.post('/login', internalLogin);
router.post('/signup', protectDashboard, requireDashboardAdmin, internalSignup);
router.post('/logout', protectDashboard, internalLogout);

module.exports = router;
