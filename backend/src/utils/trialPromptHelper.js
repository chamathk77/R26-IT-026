const { formatIndustryFieldsForClient, resolveQuotationsModule } = require('./industryHelper');
const { formatBillingConfigForClient } = require('../services/billingCalculationService');

function shouldShowTrialPrompt(user, shop) {
  if (!user || !shop) {
    return false;
  }

  return (
    user.isFirsttimeLogin === true &&
    shop.status === 'disabled' &&
    !shop.isTrailStared
  );
}

function buildShopTrialState(shop) {
  if (!shop) {
    return {
      status: null,
      isTrailStared: false,
      isTrailCompleted: false,
      trailStartDate: null,
      trailEndDate: null,
    };
  }

  return {
    status: shop.status,
    isTrailStared: shop.isTrailStared,
    isTrailCompleted: shop.isTrailCompleted,
    trailStartDate: shop.trailStartDate,
    trailEndDate: shop.trailEndDate,
  };
}

function toPlainDocument(doc) {
  if (!doc) return null;
  return typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
}

/** Full user for login (excludes password and session token). */
function formatUserForLogin(user) {
  const data = toPlainDocument(user);
  if (!data) return null;

  delete data.password;
  delete data.token;
  delete data.__v;

  return data;
}

/** Full shop for login (excludes OTP fields). Industry fields are normalized for clients. */
function formatShopForLogin(shop) {
  const data = toPlainDocument(shop);
  if (!data) return null;

  delete data.otp;
  delete data.otpExpiresAt;
  delete data.__v;

  const quotationsModule = resolveQuotationsModule(data);
  delete data.automotiveModule;

  return {
    ...data,
    ...formatIndustryFieldsForClient(data),
    quotationsModule,
    billingConfig: formatBillingConfigForClient(data.billingConfig),
  };
}

module.exports = {
  shouldShowTrialPrompt,
  buildShopTrialState,
  formatUserForLogin,
  formatShopForLogin,
};
