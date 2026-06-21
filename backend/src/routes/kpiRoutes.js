const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getKpiSummary } = require('../controllers/kpiController');

const router = express.Router();

router.get('/summary', protect, getKpiSummary);

module.exports = router;
