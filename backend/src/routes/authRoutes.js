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

const router = express.Router();

router.post('/signupOnboarding', signupOnboarding);
router.post('/send-otp', sendOtp);  
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.post('/select-branch', protect, selectBranch);
router.post('/logout', protect, logout);

module.exports = router;
