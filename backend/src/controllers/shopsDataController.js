const ShopsData = require('../models/shopsData');
const User = require('../models/user');

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

function buildOwnerMobileConflictResponse(existingShop) {
  if (!existingShop) {
    return {
      success: false,
      message: 'Owner mobile number is already registered but not completed onboarding',
      shopId: null,
    };
  }

  if (existingShop.onboardStep === 'completed') {
    return {
      success: false,
      message: 'There is already an account for that owner mobile number',
    };
  }

  return {
    success: false,
    message: 'Owner mobile number is already registered but not completed onboarding',
    shopId: existingShop.shopId,
  };
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

    const existingOwnerMobile = await ShopsData.findOne({ ownerMobileNumber: ownerMobileTrimmed })
      .select('shopId onboardStep')
      .lean();
    if (existingOwnerMobile) {
      return res.status(400).json(buildOwnerMobileConflictResponse(existingOwnerMobile));
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
      if (field === 'ownerMobileNumber') {
        const ownerMobileTrimmed = String(req.body.ownerMobileNumber ?? '').trim();
        const existingOwnerMobile = ownerMobileTrimmed
          ? await ShopsData.findOne({ ownerMobileNumber: ownerMobileTrimmed })
              .select('shopId onboardStep')
              .lean()
          : null;

        return res.status(400).json(buildOwnerMobileConflictResponse(existingOwnerMobile));
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

const SHOP_FEATURE_FIELDS =
  'shopId sendReceiptSms kpi analyticsModule customerManualOrder costModule marketingModule isAdditionalUsersAdded numAdditionalUsers';

const DEFAULT_MAX_USERS = 3;

function resolveMaxUsers(isAdditionalUsersAdded, numAdditionalUsers) {
  if (isAdditionalUsersAdded && numAdditionalUsers > 0) {
    return DEFAULT_MAX_USERS + numAdditionalUsers;
  }
  return DEFAULT_MAX_USERS;
}

function mapShopFeaturesResponse(shop) {
  return {
    sendReceiptSms: shop.sendReceiptSms,
    kpi: shop.kpi,
    analyticsModule: shop.analyticsModule,
    customerManualOrder: shop.customerManualOrder,
    costModule: shop.costModule,
    marketingModule: shop.marketingModule,
    isAdditionalUsersAdded: shop.isAdditionalUsersAdded,
    numAdditionalUsers: shop.numAdditionalUsers,
  };
}

const getShopFeatures = async (req, res) => {
  try {
    const shopId = req.query.shopId ?? req.params.shopId ?? req.user?.shopId;

    if (!shopId?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }

    const normalizedShopId = normalizeShopId(shopId);

    if (!isValidShopIdFormat(normalizedShopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }

    if (req.user?.shopId && req.user.shopId !== normalizedShopId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this shop' });
    }

    const shop = await ShopsData.findOne({ shopId: normalizedShopId })
      .select(SHOP_FEATURE_FIELDS)
      .lean();

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    return res.status(200).json({
      success: true,
      shopId: shop.shopId,
      message: 'Shop features loaded',
      features: mapShopFeaturesResponse(shop),
    });
  } catch (error) {
    console.log('error in getShopFeatures', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

async function parseShopFeaturesInput(body) {
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
  } = body;

  if (!shopId?.trim()) {
    return { error: { status: 400, body: { success: false, message: 'Shop id is required' } } };
  }

  const normalizedShopId = normalizeShopId(shopId);

  if (!isValidShopIdFormat(normalizedShopId)) {
    return { error: { status: 400, body: { success: false, message: 'Invalid shop id format' } } };
  }

  const shop = await ShopsData.findOne({ shopId: normalizedShopId });
  if (!shop) {
    return { error: { status: 404, body: { success: false, message: 'Shop not found' } } };
  }

  const sendReceiptSmsParsed = requireBooleanField(sendReceiptSms, 'sendReceiptSms');
  if (sendReceiptSmsParsed.error) {
    return { error: { status: 400, body: { success: false, message: sendReceiptSmsParsed.error } } };
  }

  if (sendReceiptSmsParsed.value) {
    const senderId = shop.senderId?.trim();
    if (!senderId) {
      return {
        error: {
          status: 400,
          body: {
            success: false,
            message:
              'Cannot activate receipt SMS. Please request to register your shop name as an SMS sender ID first.',
            code: 'SENDER_ID_NOT_REGISTERED',
          },
        },
      };
    }
  }

  const kpiParsed = requireBooleanField(kpi, 'kpi');
  if (kpiParsed.error) {
    return { error: { status: 400, body: { success: false, message: kpiParsed.error } } };
  }

  const analyticsModuleParsed = requireBooleanField(analyticsModule, 'analyticsModule');
  if (analyticsModuleParsed.error) {
    return { error: { status: 400, body: { success: false, message: analyticsModuleParsed.error } } };
  }

  const customerManualOrderParsed = requireBooleanField(
    customerManualOrder,
    'customerManualOrder',
  );
  if (customerManualOrderParsed.error) {
    return {
      error: { status: 400, body: { success: false, message: customerManualOrderParsed.error } },
    };
  }

  const costModuleParsed = requireBooleanField(costModule, 'costModule');
  if (costModuleParsed.error) {
    return { error: { status: 400, body: { success: false, message: costModuleParsed.error } } };
  }

  const marketingModuleParsed = requireBooleanField(marketingModule, 'marketingModule');
  if (marketingModuleParsed.error) {
    return {
      error: { status: 400, body: { success: false, message: marketingModuleParsed.error } },
    };
  }

  const isAdditionalUsersAddedParsed = requireBooleanField(
    isAdditionalUsersAdded,
    'isAdditionalUsersAdded',
  );
  if (isAdditionalUsersAddedParsed.error) {
    return {
      error: { status: 400, body: { success: false, message: isAdditionalUsersAddedParsed.error } },
    };
  }

  let numAdditionalUsersValue = null;
  if (isAdditionalUsersAddedParsed.value) {
    if (numAdditionalUsers === undefined || numAdditionalUsers === null || numAdditionalUsers === '') {
      return {
        error: {
          status: 400,
          body: {
            success: false,
            message: 'numAdditionalUsers is required when isAdditionalUsersAdded is true',
          },
        },
      };
    }

    const parsedCount = Number.parseInt(String(numAdditionalUsers), 10);
    if (Number.isNaN(parsedCount) || parsedCount < 1) {
      return {
        error: {
          status: 400,
          body: {
            success: false,
            message: 'numAdditionalUsers must be a number greater than 0',
          },
        },
      };
    }
    numAdditionalUsersValue = parsedCount;
  }

  const updatedMaxUsers = resolveMaxUsers(
    isAdditionalUsersAddedParsed.value,
    numAdditionalUsersValue ?? 0,
  );

  return {
    normalizedShopId,
    featureUpdates: {
      sendReceiptSms: sendReceiptSmsParsed.value,
      kpi: kpiParsed.value,
      analyticsModule: analyticsModuleParsed.value,
      customerManualOrder: customerManualOrderParsed.value,
      costModule: costModuleParsed.value,
      marketingModule: marketingModuleParsed.value,
      isAdditionalUsersAdded: isAdditionalUsersAddedParsed.value,
      numAdditionalUsers: numAdditionalUsersValue,
      maxUsers: updatedMaxUsers,
    },
  };
}

const onboardingShopFeatures = async (req, res) => {
  try {
    const parsed = await parseShopFeaturesInput(req.body);
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error.body);
    }

    const { normalizedShopId, featureUpdates } = parsed;

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $set: { ...featureUpdates, onboardStep: 'featureSelected' } },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    res.status(200).json({
      success: true,
      shopId: updated.shopId,
      onboardStep: updated.onboardStep,
      message: 'Shop features saved',
      features: {
        ...mapShopFeaturesResponse(updated),
        maxUsers: updated.maxUsers,
      },
    });
  } catch (error) {
    console.log('error in onboardingShopFeatures', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatedShopFeatures = async (req, res) => {
  try {
    const shopId = req.body.shopId ?? req.user?.shopId;
    const parsed = await parseShopFeaturesInput({ ...req.body, shopId });
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error.body);
    }

    const { normalizedShopId, featureUpdates } = parsed;

    if (req.user?.shopId && req.user.shopId !== normalizedShopId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this shop' });
    }

    if (featureUpdates.isAdditionalUsersAdded) {
      const additionalCount = Number(featureUpdates.numAdditionalUsers);
      if (!Number.isInteger(additionalCount) || additionalCount < 1) {
        return res.status(400).json({
          success: false,
          message: 'numAdditionalUsers must be a number greater than 0 when isAdditionalUsersAdded is true',
        });
      }
      featureUpdates.numAdditionalUsers = additionalCount;
      featureUpdates.maxUsers = DEFAULT_MAX_USERS + additionalCount;
    } else {
      featureUpdates.numAdditionalUsers = null;
      featureUpdates.maxUsers = DEFAULT_MAX_USERS;
    }

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $set: featureUpdates },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    res.status(200).json({
      success: true,
      shopId: updated.shopId,
      message: 'Shop features updated',
      features: {
        ...mapShopFeaturesResponse(updated),
        maxUsers: updated.maxUsers,
      },
    });
  } catch (error) {
    console.log('error in updatedShopFeatures', error);
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
      updates.onboardStep = 'completed';
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

const removeOnboardingData = async (req, res) => {
  try {
    const { shopId } = req.body;

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

    if (shop.onboardStep === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove onboarding data for a completed shop',
        shopId: normalizedShopId,
        onboardStep: shop.onboardStep,
      });
    }

    const userDeleteResult = await User.deleteMany({ shopId: normalizedShopId });
    await ShopsData.deleteOne({ shopId: normalizedShopId });

    res.status(200).json({
      success: true,
      shopId: normalizedShopId,
      removedUsers: userDeleteResult.deletedCount,
      message: 'Onboarding data removed successfully',
    });
  } catch (error) {
    console.log('error in removeOnboardingData', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createShopOnboarding,
  getShopFeatures,
  onboardingShopFeatures,
  updatedShopFeatures,
  setSubscription,
  removeOnboardingData,
};