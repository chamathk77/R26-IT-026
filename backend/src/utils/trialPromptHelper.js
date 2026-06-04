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

function buildUserLoginState(user, onboardStep) {
  return {
    _id: user._id,
    shopId: user.shopId || null,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    onboardStep,
    isFirsttimeLogin: user.isFirsttimeLogin ?? true,
  };
}

function buildShopLoginState(shop) {
  if (!shop) {
    return null;
  }

  return {
    shopId: shop.shopId,
    shopName: shop.shopName,
    address: shop.address,
    shopMobileNumber: shop.shopMobileNumber,
    ownerFirstName: shop.ownerFirstName,
    ownerLastName: shop.ownerLastName,
    ownerMobileNumber: shop.ownerMobileNumber,
    email: shop.email,
    status: shop.status,
    onboardStep: shop.onboardStep,
    isTrailStared: shop.isTrailStared,
    isTrailCompleted: shop.isTrailCompleted,
    trailStartDate: shop.trailStartDate,
    trailEndDate: shop.trailEndDate,
    isVerifyEmail: shop.isVerifyEmail,
    isVerifyPhoneNumber: shop.isVerifyPhoneNumber,
  };
}

module.exports = {
  shouldShowTrialPrompt,
  buildShopTrialState,
  buildUserLoginState,
  buildShopLoginState,
};
