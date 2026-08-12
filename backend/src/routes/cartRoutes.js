const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createCartSession,
  getCartSessions,
  getCartSessionDetail,
  getCartItems,
  addCartItem,
  updateCartSessionStatus,
  updateCartSessionTable,
  sendCartSessionToKitchen,
  checkoutCartSession,
  updateCartSessionItem,
  removeCartSessionItem,
  deleteCartSession,
} = require('../controllers/cartController');

const router = express.Router();

router.post('/sessions', protect, createCartSession);
router.get('/sessions', protect, getCartSessions);
router.get('/sessions/:sessionId/detail', protect, getCartSessionDetail);
router.patch('/sessions/:sessionId/table', protect, updateCartSessionTable);
router.post('/sessions/:sessionId/send-to-kitchen', protect, sendCartSessionToKitchen);
router.post('/sessions/:sessionId/checkout', protect, checkoutCartSession);
router.patch('/sessions/:sessionId/status', protect, updateCartSessionStatus);
router.patch('/sessions/:sessionId/items', protect, updateCartSessionItem);
router.delete('/sessions/:sessionId/items/:productId', protect, removeCartSessionItem);
router.delete('/sessions/:sessionId', protect, deleteCartSession);
router.get('/', protect, getCartItems);
router.post('/', protect, addCartItem);

module.exports = router;
