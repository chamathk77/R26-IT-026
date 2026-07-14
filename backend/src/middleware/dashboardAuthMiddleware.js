const jwt = require('jsonwebtoken');
const DashboardUser = require('../models/dashboardUser');
const { validateStoredDashboardToken } = require('../utils/dashboardTokenHelper');

async function loadDashboardUser(userId) {
  return DashboardUser.findById(userId)
    .select('role name email phone isActive')
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
          await DashboardUser.findByIdAndUpdate(expiredPayload.id, { token: null });
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

    const tokenCheck = await validateStoredDashboardToken(decoded.id, bearerToken);
    if (!tokenCheck.valid) {
      return res.status(tokenCheck.status).json(tokenCheck.body);
    }

    try {
      const user = await loadDashboardUser(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Dashboard user not found',
          code: 'USER_NOT_FOUND',
        });
      }

      if (user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: 'This dashboard account has been deactivated',
          sessionEnded: true,
          code: 'DASHBOARD_USER_INACTIVE',
        });
      }

      req.user = {
        id: decoded.id,
        role: user.role,
        isDashboardUser: true,
      };
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

async function requireDashboardAdmin(req, res, next) {
  try {
    const user = await DashboardUser.findById(req.user.id)
      .select('role isActive')
      .lean();

    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'Dashboard access required',
        code: 'NOT_DASHBOARD_USER',
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'This dashboard account has been deactivated',
        code: 'DASHBOARD_USER_INACTIVE',
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only dashboard admins can create dashboard users',
        code: 'DASHBOARD_ADMIN_REQUIRED',
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
  requireDashboardAdmin,
};
