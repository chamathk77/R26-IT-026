const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createQuotation,
  listQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
} = require('../controllers/quotationController');

const router = express.Router();

router.post('/', protect, createQuotation);
router.get('/', protect, listQuotations);
router.get('/:id', protect, getQuotationById);
router.put('/:id', protect, updateQuotation);
router.delete('/:id', protect, deleteQuotation);

module.exports = router;
