const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createShopOnboarding, updateShopFeatures, setSubscription, removeOnboardingData } = require('../controllers/shopsDataController');
const { startTrail, skipTrail, finishTrail } = require('../controllers/trialController');

const router = express.Router();

router.post('/onboarding', createShopOnboarding);
router.post('/remove-onboarding', removeOnboardingData);
router.post('/features', updateShopFeatures);
router.post('/subscription', setSubscription);
router.post('/start-trial', protect, startTrail);
router.post('/skip-trial', protect, skipTrail);
router.post('/finish-trial', protect, finishTrail);

module.exports = router;