const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { validateStoredToken } = require('./authMiddleware');

async function loadInternalUser(userId) {
  return User.findById(userId)
    .select('isInternalUser role name email phone')
    .lean();
}

function createProtectDashboard() {
  return async (req, res, next) => {
    let bearerToken;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      bearerToken = req.headers.authorization.split(' ')[1];
    }

    if (!bearerToken) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token',
        code: 'NO_TOKEN',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const expiredPayload = jwt.decode(bearerToken);
        if (expiredPayload?.id) {
          await User.findByIdAndUpdate(expiredPayload.id, { token: null });
        }
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please log in again.',
          tokenExpired: true,
          sessionEnded: true,
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token invalid',
        tokenInvalid: true,
        code: 'TOKEN_INVALID',
      });
    }

    const tokenCheck = await validateStoredToken(decoded.id, bearerToken);
    if (!tokenCheck.valid) {
      return res.status(tokenCheck.status).json(tokenCheck.body);
    }

    try {
      const user = await loadInternalUser(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      if (!user.isInternalUser) {
        return res.status(403).json({
          success: false,
          message: 'This area is for SmartCost internal dashboard users only',
          code: 'NOT_INTERNAL_USER',
        });
      }

      req.user = {
        id: decoded.id,
        role: user.role,
        isInternalUser: true,
      };
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

async function requireInternalAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('role isInternalUser').lean();
    if (!user?.isInternalUser) {
      return res.status(403).json({
        success: false,
        message: 'Internal dashboard access required',
        code: 'NOT_INTERNAL_USER',
      });
    }
    if (user.role !== 'internalAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Only internal admins can create dashboard users',
        code: 'INTERNAL_ADMIN_REQUIRED',
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

const protectDashboard = createProtectDashboard();

module.exports = {
  protectDashboard,
  createProtectDashboard,
  requireInternalAdmin,
};
