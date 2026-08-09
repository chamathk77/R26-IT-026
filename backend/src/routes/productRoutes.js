const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { uploadProductImageSingle } = require('../middleware/uploadProductImage');
const {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { bulkImportProducts, getBulkProductImportResult, deleteAllShopCatalogData, dismissBulkProductImportResult } = require('../controllers/bulkProductImportController');

const router = express.Router();

router.get('/bulk-import/result', protect, getBulkProductImportResult);
router.delete('/bulk-import/result', protect, dismissBulkProductImportResult);
router.post('/bulk-import', protect, bulkImportProducts);
router.delete('/bulk-import/catalog', protect, deleteAllShopCatalogData);
router.post('/', protect, uploadProductImageSingle, createProduct);
router.get('/', protect, getProducts);
router.post('/:id/update', protect, uploadProductImageSingle, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;
