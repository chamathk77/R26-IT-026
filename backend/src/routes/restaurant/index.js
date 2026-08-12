const express = require('express');
const tableRoutes = require('./tableRoutes');
const kitchenRoutes = require('./kitchenRoutes');

const router = express.Router();

router.use('/tables', tableRoutes);
router.use('/kitchen', kitchenRoutes);

module.exports = router;
