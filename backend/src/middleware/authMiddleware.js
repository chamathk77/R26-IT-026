const jwt = require('jsonwebtoken');
const User = require('../models/user');

function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch {
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
}

async function requireOwner(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('role shopId').lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }
    if (user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only shop owners can create staff or admin accounts',
      });
    }
    req.user.role = user.role;
    req.user.shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { protect, requireOwner };
