const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { uploadReceiptImageSingle } = require('../middleware/uploadReceiptImage');
const {
  paymentSubmit,
  getPaymentsByShop,
  getRecentPaymentByShop,
  getUpFrontPaymentByLoggedInShop,
  getInitialSubscriptionPayment,
  reverseSubscriptionSelection,
} = require('../controllers/paymentController');

const router = express.Router();
router.get('/upfront', protect, getUpFrontPaymentByLoggedInShop);
router.get('/initial-subscription', protect, getInitialSubscriptionPayment);
router.post('/reverse-subscription-selection', protect, reverseSubscriptionSelection);
router.get('/shop/:shopId/recent', protect, getRecentPaymentByShop);
router.get('/shop/:shopId', protect, getPaymentsByShop);

router.post('/:paymentId/submit', protect, uploadReceiptImageSingle, paymentSubmit);

module.exports = router;
