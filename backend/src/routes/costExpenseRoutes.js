const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { uploadCostExpenseImageSingle } = require('../middleware/uploadCostExpenseImage');
const {
  createCostExpense,
  getCostExpenses,
  getCostHistory,
  getCostExpenseById,
  updateCostExpense,
  deleteCostExpense,
} = require('../controllers/costExpenseController');

const router = express.Router();

router.post('/', protect, uploadCostExpenseImageSingle, createCostExpense);
// router.get('/', protect, getCostExpenses);
router.get('/history', protect, getCostHistory);
router.get('/:id', protect, getCostExpenseById);
router.put('/:id', protect, uploadCostExpenseImageSingle, updateCostExpense);
router.delete('/:id', protect, deleteCostExpense);

module.exports = router;
