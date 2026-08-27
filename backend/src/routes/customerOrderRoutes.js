const express = require('express');
const {
  getCustomerMenu,
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderRecommendations,
} = require('../controllers/customerOrderController');

// Public routes — reached from the branch QR code, no login.
const router = express.Router();

router.get('/:shopId/:branchId/menu', getCustomerMenu);
router.post('/:shopId/:branchId/orders', createCustomerOrder);
router.get('/:shopId/:branchId/orders', getCustomerOrders);
router.post('/:shopId/:branchId/recommendations', getCustomerOrderRecommendations);

module.exports = router;
