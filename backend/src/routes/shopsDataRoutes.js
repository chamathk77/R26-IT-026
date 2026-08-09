const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createShopOnboarding,
  getShopModuleFeatures,
  getShopUsersFeatures,
  getShopSmsFeatures,
  getSmsPackages,
  getSubscriptionPlans,
  getSettingsData,
  onboardingShopFeatures,
  updateShopModuleFeatures,
  updateShopUsersFeatures,
  manageSmsFeature,
  createPendingInactiveSmsRequest,
  cancelPendingInactiveSmsRequest,
  setSubscription,
  createPendingRequest_ChangeSubscription,
  cancelPendingRequest_ChangeSubscription,
  getPendingRequest_ChangeSubscription,
  removeOnboardingData,
} = require('../controllers/shopsDataController');
const { startTrail, skipTrail, finishTrail } = require('../controllers/trialController');
const { selectNewSubscripton } = require('../controllers/changeSubscriptionController');

const router = express.Router();

router.post('/onboarding', createShopOnboarding);
router.post('/remove-onboarding', removeOnboardingData);
router.post('/features/onboarding', onboardingShopFeatures);


router.put('/features/modules', protect, updateShopModuleFeatures);
router.put('/features/users', protect, updateShopUsersFeatures);
router.put('/features/sms/manage', protect, manageSmsFeature);
router.post('/features/sms/schedule-deactivation', protect, createPendingInactiveSmsRequest);
router.post('/features/sms/cancel-deactivation', protect, cancelPendingInactiveSmsRequest);
router.get('/sms-packages', protect, getSmsPackages);
router.get('/subscription-plans', protect, getSubscriptionPlans);
router.get('/settings-data', protect, getSettingsData);

router.get('/features/modules', protect, getShopModuleFeatures);
router.get('/features/users', protect, getShopUsersFeatures);
router.get('/features/sms', protect, getShopSmsFeatures);

router.post('/subscription',protect, setSubscription);
router.get(
  '/subscription/change/pending',
  protect,
  getPendingRequest_ChangeSubscription,
);
router.post(
  '/subscription/change/pending',
  protect,
  createPendingRequest_ChangeSubscription,
);
router.post(
  '/subscription/change/cancel',
  protect,
  cancelPendingRequest_ChangeSubscription,
);
router.post('/subscription/change/select', protect, selectNewSubscripton);

//trial related
router.post('/start-trial', protect, startTrail);
router.post('/skip-trial', protect, skipTrail);
router.post('/finish-trial', protect, finishTrail);

module.exports = router;