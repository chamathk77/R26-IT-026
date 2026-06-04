const express = require('express');
const { createProtect } = require('../middleware/authMiddleware');
const { uploadReceiptImageSingle } = require('../middleware/uploadReceiptImage');
const {
  submitPayment,
  resubmitPayment,
  getPaymentsByShop,
  getRecentPaymentByShop,
  getPaymentByReceiptNumber,
} = require('../controllers/paymentController');

const router = express.Router();
const paymentAuth = createProtect({ allowWhenTrialExpired: true });

router.get('/shop/:shopId/recent', paymentAuth, getRecentPaymentByShop);
router.get('/shop/:shopId', paymentAuth, getPaymentsByShop);
router.get('/receipt/:receiptNumber', paymentAuth, getPaymentByReceiptNumber);
router.post('/submit', paymentAuth, uploadReceiptImageSingle, submitPayment);
router.post('/:paymentId/resubmit', paymentAuth, uploadReceiptImageSingle, resubmitPayment);

module.exports = router;
