const express = require('express');
const { protect, requireOwner } = require('../middleware/authMiddleware');
const { signupStaff, signupOnbading, login } = require('../controllers/authController');

const router = express.Router();

router.post('/signupStaff', protect, requireOwner, signupStaff);
router.post('/signupOnbading', signupOnbading);
router.post('/login', login);

module.exports = router;
