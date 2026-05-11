const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createCartSession,
  getCartSessions,
  getCartItems,
  addCartItem,
  updateCartItem,
  updateCartSessionStatus,
  updateCartSessionItem,
  removeCartSessionItem,
  deleteCartSession,
  removeCartItem,
} = require('../controllers/cartController');

const router = express.Router();

router.post('/sessions', protect, createCartSession);
router.get('/sessions', protect, getCartSessions);
router.patch('/sessions/:sessionId/status', protect, updateCartSessionStatus);
router.patch('/sessions/:sessionId/items', protect, updateCartSessionItem);
router.delete('/sessions/:sessionId/items/:productId', protect, removeCartSessionItem);
router.delete('/sessions/:sessionId', protect, deleteCartSession);
router.get('/', protect, getCartItems);
router.post('/', protect, addCartItem);
router.put('/:id', protect, updateCartItem);
router.delete('/:id', protect, removeCartItem);

module.exports = router;
