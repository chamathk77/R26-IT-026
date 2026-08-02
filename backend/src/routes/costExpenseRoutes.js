const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { uploadCostExpenseImageSingle } = require('../middleware/uploadCostExpenseImage');
const {
  createCostExpense,
  getCostHistory,
  getCostExpenseById,
  updateCostExpense,
  deleteCostExpense,
  costOverview,
  costSummary,
} = require('../controllers/costExpenseController');

const router = express.Router();

router.post('/', protect, uploadCostExpenseImageSingle, createCostExpense);
// router.get('/', protect, getCostExpenses);
router.get('/overview', protect, costOverview);
router.get('/summary', protect, costSummary);
router.get('/history', protect, getCostHistory);
router.get('/:id', protect, getCostExpenseById);
router.put('/:id', protect, uploadCostExpenseImageSingle, updateCostExpense);
router.delete('/:id', protect, deleteCostExpense);

module.exports = router;
