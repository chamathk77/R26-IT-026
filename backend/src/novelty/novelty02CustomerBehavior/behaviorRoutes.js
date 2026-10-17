const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { getCustomerBehaviorInsights } = require('./behaviorController');
const {
  getRetentionActions,
  getRetentionActionById,
  createRetentionAction,
  updateRetentionAction,
  deleteRetentionAction,
} = require('./actionController');

const router = express.Router();

router.get('/insights', protect, getCustomerBehaviorInsights);

// Customer Retention Action Management CRUD
router.get('/actions', protect, getRetentionActions);
router.get('/actions/:id', protect, getRetentionActionById);
router.post('/actions', protect, createRetentionAction);
router.patch('/actions/:id', protect, updateRetentionAction);
router.delete('/actions/:id', protect, deleteRetentionAction);

module.exports = router;
