const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const {
  getKitchenTickets,
  updateKitchenTicketStatus,
} = require('../../controllers/restaurant/kitchenController');

const router = express.Router();

router.get('/tickets', protect, getKitchenTickets);
router.patch('/tickets/:ticketId/status', protect, updateKitchenTicketStatus);

module.exports = router;
