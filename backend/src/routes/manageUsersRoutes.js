const express = require('express');
const { protect, requireOwner } = require('../middleware/authMiddleware');
const {
  createShopUser,
  getShopUsers,
  updateShopUser,
  deleteShopUser,
  getLoggedUserBranches,
} = require('../controllers/manageUsersController');

const router = express.Router();

router.post('/', protect, requireOwner, createShopUser);
router.get('/logged-user/branches', protect, getLoggedUserBranches);
router.get('/', protect, requireOwner, getShopUsers);
router.put('/:userId', protect, requireOwner, updateShopUser);
router.delete('/:userId', protect, requireOwner, deleteShopUser);

module.exports = router;
