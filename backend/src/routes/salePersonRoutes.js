const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { uploadSalePersonImageSingle } = require('../middleware/uploadSalePersonImage');
const {
  createSalePerson,
  getSalePersons,
  getSalePersonsForLoggedUserBranch,
  getSalePersonById,
  updateSalePerson,
  deleteSalePerson,
} = require('../controllers/salePersonController');

const router = express.Router();

router.post('/', protect, uploadSalePersonImageSingle, createSalePerson);
router.get('/logged-user/branch', protect, getSalePersonsForLoggedUserBranch);
router.get('/', protect, getSalePersons);
router.get('/:id', protect, getSalePersonById);
router.post('/:id/update', protect, uploadSalePersonImageSingle, updateSalePerson);
router.delete('/:id', protect, deleteSalePerson);

module.exports = router;
