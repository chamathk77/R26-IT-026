const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  signupOnboarding,
  sendOtp,
  verifyOtp,
  login,
  selectBranch,
  logout,
} = require('../controllers/authController');
const {
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetForgotPassword,
} = require('../controllers/forgotPasswordController');

const router = express.Router();

router.post('/signupOnboarding', signupOnboarding);
router.post('/send-otp', sendOtp);  
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password/send-otp', sendForgotPasswordOtp);
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtp);
router.post('/forgot-password/reset-password', resetForgotPassword);
router.post('/login', login);
router.post('/select-branch', protect, selectBranch);
router.post('/logout', protect, logout);

module.exports = router;
