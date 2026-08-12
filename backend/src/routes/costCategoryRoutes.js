const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createCostCategory,
  getCostCategories,
  getCostCategoryById,
  updateCostCategory,
  deleteCostCategory,
} = require('../controllers/costCategoryController');

const router = express.Router();

router.post('/', protect, createCostCategory);
router.get('/', protect, getCostCategories);
router.get('/:id', protect, getCostCategoryById);
router.put('/:id', protect, updateCostCategory);
router.delete('/:id', protect, deleteCostCategory);

module.exports = router;
