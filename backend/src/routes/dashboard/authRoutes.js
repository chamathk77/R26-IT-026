const express = require('express');
const {
  internalLogin,
  internalSignup,
  internalLogout,
} = require('../../controllers/dashboard/internalAuthController');
const {
  protectDashboard,
  requireInternalAdmin,
} = require('../../middleware/dashboardAuthMiddleware');

const router = express.Router();

router.post('/login', internalLogin);
router.post('/signup', protectDashboard, requireInternalAdmin, internalSignup);
router.post('/logout', protectDashboard, internalLogout);

module.exports = router;
