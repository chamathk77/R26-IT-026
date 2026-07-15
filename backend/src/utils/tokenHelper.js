const User = require('../models/user');
const generateToken = require('./generateToken');
const { getTokenExpiresInSeconds } = require('./trialHelper');

async function saveUserToken(userId, token) {
  await User.findByIdAndUpdate(userId, { token });
  return token;
}

async function clearUserToken(userId) {
  await User.findByIdAndUpdate(userId, { token: null });
}

async function createAndSaveLoginToken(userId, expiresIn = '7d', claims = {}) {
  const token = generateToken(userId, expiresIn, claims);
  await saveUserToken(userId, token);
  return token;
}

/**
 * Trial / work token includes shopId + branchId (onboarding branch during trial).
 * @param {string} userId
 * @param {object} shop - shop document (needs shopId, trailEndDate, etc.)
 * @param {string} branchId - assigned branch for this session
 */
async function createAndSaveTrialToken(userId, shop, branchId) {
  const seconds = getTokenExpiresInSeconds(shop);
  const token = generateToken(userId, seconds, {
    shopId: shop.shopId,
    branchId,
  });
  await saveUserToken(userId, token);
  return { token, tokenExpiresInSeconds: seconds, shopId: shop.shopId, branchId };
}

module.exports = {
  saveUserToken,
  clearUserToken,
  createAndSaveLoginToken,
  createAndSaveTrialToken,
};
