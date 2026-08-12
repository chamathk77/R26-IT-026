const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const {
  getTables,
  createTable,
  bulkCreateTables,
  updateTable,
  deleteTable,
  bulkDeleteTables,
} = require('../../controllers/restaurant/tableController');

const router = express.Router();

router.get('/', protect, getTables);
router.post('/', protect, createTable);
router.post('/bulk', protect, bulkCreateTables);
router.post('/bulk-delete', protect, bulkDeleteTables);
router.post('/:id/update', protect, updateTable);
router.post('/:id/delete', protect, deleteTable);

module.exports = router;
