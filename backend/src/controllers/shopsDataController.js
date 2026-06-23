const ShopsData = require('../models/shopsData');

function normalizeShopId(shopId) {
  return String(shopId).trim().toUpperCase();
}

function isValidShopIdFormat(shopId) {
  return /^SI\d{6}$/.test(shopId);
}

function parseFeatureBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function requireBooleanField(value, fieldName) {
  const parsed = parseFeatureBoolean(value);
  if (parsed === null) {
    return { error: `${fieldName} must be a boolean` };
  }
  return { value: parsed };
}

const createShopOnboarding = async (req, res) => {
  try {
    const {
      shopName,
      address,
      shopMobileNumber,
      ownerFirstName,
      ownerLastName,
      ownerMobileNumber,
      email,
    } = req.body;

    if (!shopName?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop name is required' });
    }
    if (!address?.trim()) {
      return res.status(400).json({ success: false, message: 'Address is required' });
    }
    if (!shopMobileNumber?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop mobile number is required' });
    }
    if (!ownerFirstName?.trim()) {
      return res.status(400).json({ success: false, message: 'Owner first name is required' });
    }
    if (!ownerLastName?.trim()) {
      return res.status(400).json({ success: false, message: 'Owner last name is required' });
    }
    if (!ownerMobileNumber?.trim()) {
      return res.status(400).json({ success: false, message: 'Owner mobile number is required' });
    }
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    const shopMobileTrimmed = String(shopMobileNumber).trim();
    const ownerMobileTrimmed = String(ownerMobileNumber).trim();
    const emailTrimmed = String(email).trim().toLowerCase();

    const existingShopMobile = await ShopsData.findOne({ shopMobileNumber: shopMobileTrimmed }).lean();
    if (existingShopMobile) {
      return res.status(400).json({
        success: false,
        message: 'Shop mobile number is already registered to another shop',
      });
    }

    const existingOwnerMobile = await ShopsData.findOne({ ownerMobileNumber: ownerMobileTrimmed }).lean();
    if (existingOwnerMobile) {
      return res.status(400).json({
        success: false,
        message: 'Owner mobile number is already registered to another shop',
      });
    }

    const existingEmail = await ShopsData.findOne({ email: emailTrimmed }).lean();
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered to another shop',
      });
    }

    const shop = await ShopsData.create({
      shopName: String(shopName).trim(),
      address: String(address).trim(),
      shopMobileNumber: shopMobileTrimmed,
      ownerFirstName: String(ownerFirstName).trim(),
      ownerLastName: String(ownerLastName).trim(),
      ownerMobileNumber: ownerMobileTrimmed,
      email: emailTrimmed,
      isVerifyEmail: false,
      isVerifyPhoneNumber: false,
      onboardStep: 'shopRegistered',
    });

    res.status(201).json({
      success: true,
      shopId: shop.shopId,
      onboardStep: shop.onboardStep,
      message: 'Shop onboarding saved',
    });
  } catch (error) {
    console.log('error in createShopOnboarding', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      console.log('field in createShopOnboarding', field);
      if (field === 'shopMobileNumber') {
        return res.status(400).json({
          success: false,
          message: 'Shop mobile number is already registered to another shop',
        });
      }
      if (field === 'ownerMobileNumber') {
        return res.status(400).json({
          success: false,
          message: 'Owner mobile number is already registered to another shop',
        });
      }
      if (field === 'email') {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered to another shop',
        });
      }
      return res.status(400).json({ success: false, message: 'Shop id conflict, please try again' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShopFeatures = async (req, res) => {
  try {
    const {
      shopId,
      sendReceiptSms,
      kpi,
      analyticsModule,
      customerManualOrder,
      costModule,
      marketingModule,
      isAdditionalUsersAdded,
      numAdditionalUsers,
    } = req.body;

    if (!shopId?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }

    const normalizedShopId = normalizeShopId(shopId);

    if (!isValidShopIdFormat(normalizedShopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }

    const shop = await ShopsData.findOne({ shopId: normalizedShopId });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const sendReceiptSmsParsed = requireBooleanField(sendReceiptSms, 'sendReceiptSms');
    if (sendReceiptSmsParsed.error) {
      return res.status(400).json({ success: false, message: sendReceiptSmsParsed.error });
    }

    const kpiParsed = requireBooleanField(kpi, 'kpi');
    if (kpiParsed.error) {
      return res.status(400).json({ success: false, message: kpiParsed.error });
    }

    const analyticsModuleParsed = requireBooleanField(analyticsModule, 'analyticsModule');
    if (analyticsModuleParsed.error) {
      return res.status(400).json({ success: false, message: analyticsModuleParsed.error });
    }

    const customerManualOrderParsed = requireBooleanField(
      customerManualOrder,
      'customerManualOrder',
    );
    if (customerManualOrderParsed.error) {
      return res.status(400).json({ success: false, message: customerManualOrderParsed.error });
    }

    const costModuleParsed = requireBooleanField(costModule, 'costModule');
    if (costModuleParsed.error) {
      return res.status(400).json({ success: false, message: costModuleParsed.error });
    }

    const marketingModuleParsed = requireBooleanField(marketingModule, 'marketingModule');
    if (marketingModuleParsed.error) {
      return res.status(400).json({ success: false, message: marketingModuleParsed.error });
    }

    const isAdditionalUsersAddedParsed = requireBooleanField(
      isAdditionalUsersAdded,
      'isAdditionalUsersAdded',
    );
    if (isAdditionalUsersAddedParsed.error) {
      return res.status(400).json({ success: false, message: isAdditionalUsersAddedParsed.error });
    }

    let numAdditionalUsersValue = null;
    if (isAdditionalUsersAddedParsed.value) {
      if (numAdditionalUsers === undefined || numAdditionalUsers === null || numAdditionalUsers === '') {
        return res.status(400).json({
          success: false,
          message: 'numAdditionalUsers is required when isAdditionalUsersAdded is true',
        });
      }

      const parsedCount = Number.parseInt(String(numAdditionalUsers), 10);
      if (Number.isNaN(parsedCount) || parsedCount < 1) {
        return res.status(400).json({
          success: false,
          message: 'numAdditionalUsers must be a number greater than 0',
        });
      }
      numAdditionalUsersValue = parsedCount;
    }

    const currentMaxUsers = shop.maxUsers ?? 3;
    let updatedMaxUsers = currentMaxUsers;

    if (isAdditionalUsersAddedParsed.value && numAdditionalUsersValue > 0) {
      updatedMaxUsers = currentMaxUsers + numAdditionalUsersValue;
    }

    const updates = {
      sendReceiptSms: sendReceiptSmsParsed.value,
      kpi: kpiParsed.value,
      analyticsModule: analyticsModuleParsed.value,
      customerManualOrder: customerManualOrderParsed.value,
      costModule: costModuleParsed.value,
      marketingModule: marketingModuleParsed.value,
      isAdditionalUsersAdded: isAdditionalUsersAddedParsed.value,
      numAdditionalUsers: numAdditionalUsersValue,
      maxUsers: updatedMaxUsers,
      onboardStep: 'featureSelected',
    };

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    res.status(200).json({
      success: true,
      shopId: updated.shopId,
      onboardStep: updated.onboardStep,
      message: 'Shop features saved',
      features: {
        sendReceiptSms: updated.sendReceiptSms,
        kpi: updated.kpi,
        analyticsModule: updated.analyticsModule,
        customerManualOrder: updated.customerManualOrder,
        costModule: updated.costModule,
        marketingModule: updated.marketingModule,
        isAdditionalUsersAdded: updated.isAdditionalUsersAdded,
        numAdditionalUsers: updated.numAdditionalUsers,
        maxUsers: updated.maxUsers,
      },
    });
  } catch (error) {
    console.log('error in updateShopFeatures', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function normalizeSubscriptionType(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!ShopsData.SUBSCRIPTION_TYPES.includes(normalized)) {
    return null;
  }
  return normalized;
}

const setSubscription = async (req, res) => {
  try {
    const { shopId, subscriptionType } = req.body;

    if (!shopId?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }

    const normalizedShopId = normalizeShopId(shopId);

    if (!isValidShopIdFormat(normalizedShopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }

    if (subscriptionType === undefined || subscriptionType === null || subscriptionType === '') {
      return res.status(400).json({ success: false, message: 'subscriptionType is required' });
    }

    const normalizedSubscriptionType = normalizeSubscriptionType(subscriptionType);
    if (!normalizedSubscriptionType) {
      return res.status(400).json({
        success: false,
        message: `subscriptionType must be one of: ${ShopsData.SUBSCRIPTION_TYPES.join(', ')}`,
      });
    }

    const shop = await ShopsData.findOne({ shopId: normalizedShopId });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const updates = {
      subscriptionType: normalizedSubscriptionType,
    };

    if (shop.onboardStep !== 'completed') {
      updates.onboardStep = 'subscriptionSelected';
    }

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    res.status(200).json({
      success: true,
      shopId: updated.shopId,
      subscriptionType: updated.subscriptionType,
      onboardStep: updated.onboardStep,
      message: 'Subscription saved',
    });
  } catch (error) {
    console.log('error in setSubscription', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createShopOnboarding,
  updateShopFeatures,
  setSubscription,
};