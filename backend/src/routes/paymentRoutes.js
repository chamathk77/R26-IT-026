const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { uploadReceiptImageSingle } = require('../middleware/uploadReceiptImage');
const {
  paymentSubmit,
  getPaymentsByShop,
  getRecentPaymentByShop,
} = require('../controllers/paymentController');

const router = express.Router();
router.get('/shop/:shopId/recent', protect, getRecentPaymentByShop);
router.get('/shop/:shopId', protect, getPaymentsByShop);

router.post('/:paymentId/submit', protect, uploadReceiptImageSingle, paymentSubmit);

module.exports = router;
