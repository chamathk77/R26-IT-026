const DashboardUser = require('../models/dashboardUser');
const generateToken = require('./generateToken');

async function saveDashboardUserToken(userId, token) {
  await DashboardUser.findByIdAndUpdate(userId, { token });
  return token;
}

async function clearDashboardUserToken(userId) {
  await DashboardUser.findByIdAndUpdate(userId, { token: null });
}

async function createAndSaveDashboardLoginToken(userId, expiresIn = '7d') {
  const token = generateToken(userId, expiresIn);
  await saveDashboardUserToken(userId, token);
  return token;
}

async function validateStoredDashboardToken(userId, bearerToken) {
  const user = await DashboardUser.findById(userId).select('token isActive').lean();

  if (!user) {
    return {
      valid: false,
      status: 401,
      body: {
        success: false,
        message: 'Dashboard user not found',
        code: 'USER_NOT_FOUND',
      },
    };
  }

  if (user.isActive === false) {
    return {
      valid: false,
      status: 403,
      body: {
        success: false,
        message: 'This dashboard account has been deactivated',
        sessionEnded: true,
        code: 'DASHBOARD_USER_INACTIVE',
      },
    };
  }

  if (!user.token || user.token !== bearerToken) {
    return {
      valid: false,
      status: 401,
      body: {
        success: false,
        message: 'Session is no longer valid. Please log in again.',
        sessionEnded: true,
        code: 'TOKEN_MISMATCH',
      },
    };
  }

  return { valid: true, user };
}

module.exports = {
  saveDashboardUserToken,
  clearDashboardUserToken,
  createAndSaveDashboardLoginToken,
  validateStoredDashboardToken,
};
