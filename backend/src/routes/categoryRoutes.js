const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const router = express.Router();

router.post('/', protect, createCategory);
router.get('/', protect, getCategories);
router.get('/:id', protect, getCategoryById);
router.post('/:id/update', protect, updateCategory);
router.post('/:id/delete', protect, deleteCategory);

module.exports = router;
