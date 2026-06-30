const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createShopOnboarding,
  getShopFeatures,
  getSmsPackages,
  onboardingShopFeatures,
  updatedShopFeatures,
  setSmsPackage,
  setSubscription,
  removeOnboardingData,
} = require('../controllers/shopsDataController');
const { startTrail, skipTrail, finishTrail } = require('../controllers/trialController');

const router = express.Router();

router.post('/onboarding', createShopOnboarding);
router.post('/remove-onboarding', removeOnboardingData);
router.get('/features', protect, getShopFeatures);
router.get('/sms-packages', getSmsPackages);
router.post('/features/onboarding', onboardingShopFeatures);
router.put('/features', protect, updatedShopFeatures);
router.post('/sms-package', protect, setSmsPackage);
router.post('/subscription', setSubscription);
router.post('/start-trial', protect, startTrail);
router.post('/skip-trial', protect, skipTrail);
router.post('/finish-trial', protect, finishTrail);

module.exports = router;