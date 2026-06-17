const express = require('express');
const { getDigitalReceipt } = require('../controllers/receiptController');

const router = express.Router();

router.get('/:historyId', getDigitalReceipt);

module.exports = router;
