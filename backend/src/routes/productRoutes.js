const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { uploadProductImageSingle } = require('../middleware/uploadProductImage');
const {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const router = express.Router();

router.post('/', protect, uploadProductImageSingle, createProduct);
router.get('/', protect, getProducts);
router.put('/:id', protect, uploadProductImageSingle, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;
