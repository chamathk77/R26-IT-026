const express = require('express');
const { protectDashboard } = require('../../middleware/dashboardAuthMiddleware');
const {
  getOnboardUsers,
  getOnboardingShopDetails,
  updateOnboardingShop,
} = require('../../controllers/dashboard/shopMngController');

const router = express.Router();

router.get('/onboard-users', protectDashboard, getOnboardUsers);
router.get('/onboard-users/:shopId', protectDashboard, getOnboardingShopDetails);
router.put('/onboard-users/:shopId', protectDashboard, updateOnboardingShop);

module.exports = router;
