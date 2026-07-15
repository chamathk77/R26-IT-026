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
 * Trial token always includes shopId; branchId only when provided (single-branch / after select).
 */
async function createAndSaveTrialToken(userId, shop, branchId = null) {
  const seconds = getTokenExpiresInSeconds(shop);
  const claims = { shopId: shop.shopId };
  if (branchId) {
    claims.branchId = branchId;
  }
  const token = generateToken(userId, seconds, claims);
  await saveUserToken(userId, token);
  return {
    token,
    tokenExpiresInSeconds: seconds,
    shopId: shop.shopId,
    branchId: branchId ?? null,
  };
}

module.exports = {
  saveUserToken,
  clearUserToken,
  createAndSaveLoginToken,
  createAndSaveTrialToken,
};
