const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createCartSession,
  getCartSessions,
  getCartItems,
  addCartItem,
  updateCartItem,
  updateCartSessionStatus,
  removeCartItem,
} = require('../controllers/cartController');

const router = express.Router();

router.post('/sessions', protect, createCartSession);
router.get('/sessions', protect, getCartSessions);
router.patch('/sessions/:sessionId/status', protect, updateCartSessionStatus);
router.get('/', protect, getCartItems);
router.post('/', protect, addCartItem);
router.put('/:id', protect, updateCartItem);
router.delete('/:id', protect, removeCartItem);

module.exports = router;
