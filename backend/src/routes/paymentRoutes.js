const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { uploadReceiptImageSingle } = require('../middleware/uploadReceiptImage');
const {
  submitPayment,
  resubmitPayment,
  getPaymentsByShop,
  getRecentPaymentByShop,
  getPaymentByReceiptNumber,
} = require('../controllers/paymentController');

const router = express.Router();
router.get('/shop/:shopId/recent', protect, getRecentPaymentByShop);
router.get('/shop/:shopId', protect, getPaymentsByShop);
router.get('/receipt/:receiptNumber', protect, getPaymentByReceiptNumber);
router.post('/submit', protect, uploadReceiptImageSingle, submitPayment);
router.post('/:paymentId/resubmit', protect, uploadReceiptImageSingle, resubmitPayment);

module.exports = router;
