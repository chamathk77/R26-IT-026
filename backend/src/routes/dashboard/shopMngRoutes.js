const express = require('express');
const {
  protectDashboard,
  requireDashboardAdmin,
} = require('../../middleware/dashboardAuthMiddleware');
const {
  getOnboardUsers,
  getOnboardingShopDetails,
  updateOnboardingShop,
  getTrialShops,
  getTrialShopDetails,
  finishTrialShop,
} = require('../../controllers/dashboard/manageTrailAndOnboardingShop');
const {
  getActiveShops,
  getActiveShopDetails,
  updateActiveShopDetails,
  getActiveShopBranches,
  getActiveShopPayments,
  getActiveShopPaymentDetails,
  updateActiveShopPayment,
  deleteActiveShopPayment,
  clearActiveShopData,
} = require('../../controllers/dashboard/activeShopsController');

const router = express.Router();

router.get('/onboard-users', protectDashboard, getOnboardUsers);
router.get('/onboard-users/:shopId', protectDashboard, getOnboardingShopDetails);
router.put('/onboard-users/:shopId', protectDashboard, updateOnboardingShop);

router.get('/trial-shops', protectDashboard, getTrialShops);
router.get('/trial-shops/:shopId', protectDashboard, getTrialShopDetails);
router.post('/trial-shops/:shopId/finish-trial', protectDashboard, finishTrialShop);

router.get('/active-shops', protectDashboard, getActiveShops);
router.get('/active-shops/:shopId/payments', protectDashboard, getActiveShopPayments);
router.get('/active-shops/:shopId/branches', protectDashboard, getActiveShopBranches);
router.get(
  '/active-shops/:shopId/payments/:paymentId',
  protectDashboard,
  getActiveShopPaymentDetails,
);
router.put(
  '/active-shops/:shopId/payments/:paymentId',
  protectDashboard,
  updateActiveShopPayment,
);
router.delete(
  '/active-shops/:shopId/payments/:paymentId',
  protectDashboard,
  deleteActiveShopPayment,
);
router.get('/active-shops/:shopId', protectDashboard, getActiveShopDetails);
router.put(
  '/active-shops/:shopId',
  protectDashboard,
  requireDashboardAdmin,
  updateActiveShopDetails,
);
router.delete('/active-shops/:shopId/clear-data', protectDashboard, clearActiveShopData);

module.exports = router;
