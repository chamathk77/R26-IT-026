const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getManualOrders,
  getManualOrderCount,
  getBranchOrderQr,
  acceptManualOrderSession,
  rejectManualOrderSession,
} = require('../controllers/manualOrderController');

const router = express.Router();

router.get('/count', protect, getManualOrderCount);
router.get('/qr', protect, getBranchOrderQr);
router.post('/:sessionId/accept', protect, acceptManualOrderSession);
router.post('/:sessionId/reject', protect, rejectManualOrderSession);
router.get('/', protect, getManualOrders);

module.exports = router;
