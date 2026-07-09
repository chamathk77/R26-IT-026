const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createShopOnboarding,
  getShopModuleFeatures,
  getShopUsersFeatures,
  getShopSmsFeatures,
  getSmsPackages,
  getSubscriptionPlans,
  onboardingShopFeatures,
  updateShopModuleFeatures,
  updateShopUsersFeatures,
  manageSmsFeature,
  updateShopSmsFeatures,
  setSubscription,
  removeOnboardingData,
} = require('../controllers/shopsDataController');
const { startTrail, skipTrail, finishTrail } = require('../controllers/trialController');

const router = express.Router();

router.post('/onboarding', createShopOnboarding);
router.post('/remove-onboarding', removeOnboardingData);
router.post('/features/onboarding', onboardingShopFeatures);


router.put('/features/modules', protect, updateShopModuleFeatures);
router.put('/features/users', protect, updateShopUsersFeatures);
router.put('/features/sms/manage', protect, manageSmsFeature);
router.put('/features/sms', protect, updateShopSmsFeatures);
router.get('/sms-packages', protect, getSmsPackages);
router.get('/subscription-plans', protect, getSubscriptionPlans);

router.get('/features/modules', protect, getShopModuleFeatures);
router.get('/features/users', protect, getShopUsersFeatures);
router.get('/features/sms', protect, getShopSmsFeatures);

router.post('/subscription',protect, setSubscription);

//trial related
router.post('/start-trial', protect, startTrail);
router.post('/skip-trial', protect, skipTrail);
router.post('/finish-trial', protect, finishTrail);

module.exports = router;