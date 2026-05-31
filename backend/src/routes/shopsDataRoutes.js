const express = require('express');
const { createShopOnboarding, updateShopFeatures } = require('../controllers/shopsDataController');

const router = express.Router();

router.post('/onboarding', createShopOnboarding);
router.post('/features', updateShopFeatures);

module.exports = router;