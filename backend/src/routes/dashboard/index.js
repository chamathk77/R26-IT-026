const express = require('express');
const authRoutes = require('./authRoutes');
const paymentsRoutes = require('./paymentsRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/payments', paymentsRoutes);

module.exports = router;
