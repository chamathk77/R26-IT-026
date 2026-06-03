const express = require('express');
const { protect, requireOwner } = require('../middleware/authMiddleware');
const {
  signupStaff,
  signupOnbading,
  sendOtp,
  verifyOtp,
  login,
} = require('../controllers/authController');

const router = express.Router();

router.post('/signupStaff', protect, requireOwner, signupStaff);
router.post('/signupOnbading', signupOnbading);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);

module.exports = router;
