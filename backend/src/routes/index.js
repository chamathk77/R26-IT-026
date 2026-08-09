const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    service: 'smartcost-api',
    database: dbConnected ? 'connected' : 'disconnected',
  });
});
 
module.exports = router;
