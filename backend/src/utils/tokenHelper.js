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

async function createAndSaveLoginToken(userId, expiresIn = '7d') {
  const token = generateToken(userId, expiresIn);
  await saveUserToken(userId, token);
  return token;
}

async function createAndSaveTrialToken(userId, shop) {
  const seconds = getTokenExpiresInSeconds(shop);
  const token = generateToken(userId, seconds);
  await saveUserToken(userId, token);
  return { token, tokenExpiresInSeconds: seconds };
}

module.exports = {
  saveUserToken,
  clearUserToken,
  createAndSaveLoginToken,
  createAndSaveTrialToken,
};
