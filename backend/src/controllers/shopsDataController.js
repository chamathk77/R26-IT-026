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

const SHOP_MODULE_FEATURE_FIELDS =
  'shopId kpi analyticsModule customerManualOrder costModule marketingModule';

const SHOP_USERS_FEATURE_FIELDS =
  'shopId maxUsers isAdditionalUsersAdded numAdditionalUsers';

const SHOP_SMS_FEATURE_FIELDS =
  'shopId smsPackageType smsUsedInPeriod smsNextRenewalDate smsPackageAmount smsFeatureStatus';

const DEFAULT_MAX_USERS = 3;

function resolveMaxUsers(isAdditionalUsersAdded, numAdditionalUsers) {
  if (isAdditionalUsersAdded && numAdditionalUsers > 0) {
    return DEFAULT_MAX_USERS + numAdditionalUsers;
  }
  return DEFAULT_MAX_USERS;
}

function shopMobileUserFilter(shopId) {
  return {
    shopId,
    isInternalUser: { $ne: true },
  };
}

async function getShopMobileUserCount(shopId) {
  return User.countDocuments(shopMobileUserFilter(shopId));
}

async function validateUserCapacityAgainstExistingUsers(shopId, proposedMaxUsers) {
  const existingUserCount = await getShopMobileUserCount(shopId);

  if (proposedMaxUsers >= existingUserCount) {
    return { existingUserCount };
  }

  const minimumAdditionalUsers = Math.max(0, existingUserCount - DEFAULT_MAX_USERS);

  return {
    error: {
      status: 400,
      body: {
        success: false,
        message:
          `Cannot reduce user capacity below your current team size. ` +
          `This shop has ${existingUserCount} user(s), but the new limit would be ${proposedMaxUsers}. ` +
          `Remove users first or set at least ${minimumAdditionalUsers} additional user(s).`,
        code: 'USER_CAPACITY_BELOW_EXISTING',
        currentUserCount: existingUserCount,
        proposedMaxUsers,
        minimumAdditionalUsers,
        includedUsers: DEFAULT_MAX_USERS,
      },
    },
  };
}

const FEATURE_UPDATE_ALLOWED_ROLES = new Set(['owner', 'admin']);

async function resolveFeatureUpdateRoleAccess(req) {
  const user = await User.findById(req.user.id).select('role').lean();
  if (!user) {
    return {
      error: {
        status: 401,
        body: { success: false, message: 'Not authorized, user not found' },
      },
    };
  }

  if (!FEATURE_UPDATE_ALLOWED_ROLES.has(user.role)) {
    return {
      error: {
        status: 403,
        body: {
          success: false,
          message: 'Only shop owners and admins can update feature settings.',
          code: 'FEATURE_UPDATE_ROLE_FORBIDDEN',
        },
      },
    };
  }

  return { userRole: user.role };
}

async function resolveFeatureUpdateAccess(req, normalizedShopId) {
  const roleAccess = await resolveFeatureUpdateRoleAccess(req);
  if (roleAccess.error) {
    return roleAccess;
  }

  const shop = await ShopsData.findOne({ shopId: normalizedShopId })
    .select('shopId status')
    .lean();

  if (!shop) {
    return {
      error: {
        status: 404,
        body: { success: false, message: 'Shop not found' },
      },
    };
  }

  if (shop.status === 'trial') {
    return {
      error: {
        status: 400,
        body: {
          success: false,
          message:
            'Feature settings cannot be updated while your shop is on a trial. Please subscribe or activate your account first.',
          code: 'FEATURE_UPDATE_NOT_ALLOWED_IN_TRIAL',
          status: shop.status,
        },
      },
    };
  }

  return { shop, userRole: roleAccess.userRole };
}

function findSmsPackage(packageType) {
  const normalized = String(packageType ?? '').trim();
  return ShopsData.SMS_PACKAGES.find((pkg) => pkg.type === normalized) ?? null;
}

function normalizeSmsPackageType(value) {
  const normalized = String(value ?? '').trim();
  if (!ShopsData.SMS_PACKAGE_TYPES.includes(normalized)) {
    return null;
  }
  return normalized;
}

function mapSmsPackageResponse(shop) {
  const selectedSmsPackage = shop.smsPackageType
    ? findSmsPackage(shop.smsPackageType)
    : null;

  return {
    smsPackageType: shop.smsPackageType ?? null,
    smsMonthlyAllowance: shop.smsMonthlyAllowance ?? null,
    smsUsedInPeriod: shop.smsUsedInPeriod ?? 0,
    smsPackageAmount: shop.smsPackageAmount ?? null,
    smsNextRenewalDate: shop.smsNextRenewalDate ?? null,
    selectedSmsPackage,
  };
}

function mapShopSmsFeaturesResponse(shop) {
  return {
    smsPackageType: shop.smsPackageType ?? null,
    smsUsedInPeriod: shop.smsUsedInPeriod ?? 0,
    smsNextRenewalDate: shop.smsNextRenewalDate ?? null,
    smsPackageAmount: shop.smsPackageAmount ?? null,
    smsFeatureStatus: shop.smsFeatureStatus ?? 'disabled',
  };
}

function resolveShopFeaturesGetRequest(req) {
  const shopId = req.query.shopId ?? req.params.shopId ?? req.user?.shopId;

  if (!shopId?.trim()) {
    return { error: { status: 400, body: { success: false, message: 'Shop id is required' } } };
  }

  const normalizedShopId = normalizeShopId(shopId);

  if (!isValidShopIdFormat(normalizedShopId)) {
    return { error: { status: 400, body: { success: false, message: 'Invalid shop id format' } } };
  }

  if (req.user?.shopId && req.user.shopId !== normalizedShopId) {
    return { error: { status: 403, body: { success: false, message: 'Not authorized for this shop' } } };
  }

  return { normalizedShopId };
}

const getShopModuleFeatures = async (req, res) => {
  try {
    const resolved = resolveShopFeaturesGetRequest(req);
    if (resolved.error) {
      return res.status(resolved.error.status).json(resolved.error.body);
    }

    const shop = await ShopsData.findOne({ shopId: resolved.normalizedShopId })
      .select(SHOP_MODULE_FEATURE_FIELDS)
      .lean();

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    return res.status(200).json({
      success: true,
      shopId: shop.shopId,
      message: 'Shop module features loaded',
      features: mapOnboardingFeaturesResponse(shop),
    });
  } catch (error) {
    console.log('error in getShopModuleFeatures', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getShopUsersFeatures = async (req, res) => {
  try {
    const resolved = resolveShopFeaturesGetRequest(req);
    if (resolved.error) {
      return res.status(resolved.error.status).json(resolved.error.body);
    }

    const shop = await ShopsData.findOne({ shopId: resolved.normalizedShopId })
      .select(SHOP_USERS_FEATURE_FIELDS)
      .lean();

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    return res.status(200).json({
      success: true,
      shopId: shop.shopId,
      message: 'Shop user settings loaded',
      features: mapShopUsersFeaturesResponse(shop),
    });
  } catch (error) {
    console.log('error in getShopUsersFeatures', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getShopSmsFeatures = async (req, res) => {
  try {
    const resolved = resolveShopFeaturesGetRequest(req);
    if (resolved.error) {
      return res.status(resolved.error.status).json(resolved.error.body);
    }

    const shop = await ShopsData.findOne({ shopId: resolved.normalizedShopId })
      .select(SHOP_SMS_FEATURE_FIELDS)
      .lean();

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    return res.status(200).json({
      success: true,
      shopId: shop.shopId,
      message: 'Shop SMS settings loaded',
      features: mapShopSmsFeaturesResponse(shop),
    });
  } catch (error) {
    console.log('error in getShopSmsFeatures', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getSmsPackages = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'SMS packages loaded',
      packages: ShopsData.SMS_PACKAGES,
    });
  } catch (error) {
    console.log('error in getSmsPackages', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

function resolveSmsPackageUpdates({ smsPackageType, sendReceiptSms, shop }) {
  if (!sendReceiptSms) {
    return { updates: {} };
  }

  const hasIncomingPackage =
    smsPackageType !== undefined && smsPackageType !== null && String(smsPackageType).trim() !== '';
  const normalizedType = hasIncomingPackage
    ? normalizeSmsPackageType(smsPackageType)
    : shop.smsPackageType;

  if (hasIncomingPackage && !normalizedType) {
    return {
      error: {
        status: 400,
        body: {
          success: false,
          message: `smsPackageType must be one of: ${ShopsData.SMS_PACKAGE_TYPES.join(', ')}`,
          code: 'INVALID_SMS_PACKAGE',
        },
      },
    };
  }

  if (!normalizedType) {
    return {
      error: {
        status: 400,
        body: {
          success: false,
          message: 'smsPackageType is required when sendReceiptSms is enabled',
          code: 'SMS_PACKAGE_REQUIRED',
        },
      },
    };
  }

  const selectedPackage = findSmsPackage(normalizedType);
  const updates = {
    smsPackageType: selectedPackage.type,
    smsMonthlyAllowance: selectedPackage.messageCount,
    smsPackageAmount: selectedPackage.fee,
  };

  if (shop.smsPackageType !== selectedPackage.type) {
    updates.smsUsedInPeriod = 0;
  }

  return { updates, selectedPackage };
}

async function parseShopModuleFeaturesInput(body) {
  const {
    shopId,
    kpi,
    analyticsModule,
    customerManualOrder,
    costModule,
    marketingModule,
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

  return {
    normalizedShopId,
    featureUpdates: {
      kpi: kpiParsed.value,
      analyticsModule: analyticsModuleParsed.value,
      customerManualOrder: customerManualOrderParsed.value,
      costModule: costModuleParsed.value,
      marketingModule: marketingModuleParsed.value,
    },
  };
}

async function parseShopUsersFeaturesInput(body) {
  const { shopId, isAdditionalUsersAdded, numAdditionalUsers } = body;

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

  const featureUpdates = {
    isAdditionalUsersAdded: isAdditionalUsersAddedParsed.value,
    numAdditionalUsers: numAdditionalUsersValue,
    maxUsers: resolveMaxUsers(isAdditionalUsersAddedParsed.value, numAdditionalUsersValue ?? 0),
  };

  return {
    normalizedShopId,
    featureUpdates,
  };
}

async function parseShopSmsFeaturesInput(body) {
  const { shopId, sendReceiptSms, smsPackageType } = body;

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

  const smsPackageResult = resolveSmsPackageUpdates({
    smsPackageType,
    sendReceiptSms: sendReceiptSmsParsed.value,
    shop,
  });
  if (smsPackageResult.error) {
    return { error: smsPackageResult.error };
  }

  return {
    normalizedShopId,
    featureUpdates: {
      sendReceiptSms: sendReceiptSmsParsed.value,
      ...smsPackageResult.updates,
    },
  };
}

function mapShopUsersFeaturesResponse(shop) {
  return {
    isAdditionalUsersAdded: shop.isAdditionalUsersAdded,
    numAdditionalUsers: shop.numAdditionalUsers,
    maxUsers: shop.maxUsers,
  };
}

async function parseOnboardingShopFeaturesInput(body) {
  const {
    shopId,
    kpi,
    analyticsModule,
    customerManualOrder,
    costModule,
    marketingModule,
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

  const featureUpdates = {
    kpi: kpiParsed.value,
    analyticsModule: analyticsModuleParsed.value,
    customerManualOrder: customerManualOrderParsed.value,
    costModule: costModuleParsed.value,
    marketingModule: marketingModuleParsed.value,
  };

  if (!Object.values(featureUpdates).some(Boolean)) {
    return {
      error: {
        status: 400,
        body: {
          success: false,
          message: 'Please enable at least one module',
        },
      },
    };
  }

  return {
    normalizedShopId,
    featureUpdates,
  };
}

function mapOnboardingFeaturesResponse(shop) {
  return {
    kpi: shop.kpi,
    analyticsModule: shop.analyticsModule,
    customerManualOrder: shop.customerManualOrder,
    costModule: shop.costModule,
    marketingModule: shop.marketingModule,
  };
}

const onboardingShopFeatures = async (req, res) => {
  try {
    const parsed = await parseOnboardingShopFeaturesInput(req.body);
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error.body);
    }

    const { normalizedShopId, featureUpdates } = parsed;

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $set: { ...featureUpdates, onboardStep: 'completed' } },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    res.status(200).json({
      success: true,
      shopId: updated.shopId,
      onboardStep: updated.onboardStep,
      message: 'Shop features saved',
      features: mapOnboardingFeaturesResponse(updated),
    });
  } catch (error) {
    console.log('error in onboardingShopFeatures', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShopModuleFeatures = async (req, res) => {
  try {
    const shopId = req.body.shopId ?? req.user?.shopId;
    const parsed = await parseShopModuleFeaturesInput({ ...req.body, shopId });
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error.body);
    }

    const { normalizedShopId, featureUpdates } = parsed;

    if (req.user?.shopId && req.user.shopId !== normalizedShopId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this shop' });
    }

    const access = await resolveFeatureUpdateRoleAccess(req);
    if (access.error) {
      return res.status(access.error.status).json(access.error.body);
    }

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $set: featureUpdates },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    res.status(200).json({
      success: true,
      shopId: updated.shopId,
      message: 'Shop module features updated',
      features: mapOnboardingFeaturesResponse(updated),
    });
  } catch (error) {
    console.log('error in updateShopModuleFeatures', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShopUsersFeatures = async (req, res) => {
  try {
    const shopId = req.body.shopId ?? req.user?.shopId;
    const parsed = await parseShopUsersFeaturesInput({ ...req.body, shopId });
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error.body);
    }

    const { normalizedShopId, featureUpdates } = parsed;

    if (req.user?.shopId && req.user.shopId !== normalizedShopId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this shop' });
    }

    const access = await resolveFeatureUpdateAccess(req, normalizedShopId);
    if (access.error) {
      return res.status(access.error.status).json(access.error.body);
    }

    const capacityCheck = await validateUserCapacityAgainstExistingUsers(
      normalizedShopId,
      featureUpdates.maxUsers,
    );
    if (capacityCheck.error) {
      return res.status(capacityCheck.error.status).json(capacityCheck.error.body);
    }

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $set: featureUpdates },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    res.status(200).json({
      success: true,
      shopId: updated.shopId,
      message: 'Shop user settings updated',
      features: mapShopUsersFeaturesResponse(updated),
    });
  } catch (error) {
    console.log('error in updateShopUsersFeatures', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShopSmsFeatures = async (req, res) => {
  try {
    const shopId = req.body.shopId ?? req.user?.shopId;
    const parsed = await parseShopSmsFeaturesInput({ ...req.body, shopId });
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error.body);
    }

    const { normalizedShopId, featureUpdates } = parsed;

    if (req.user?.shopId && req.user.shopId !== normalizedShopId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this shop' });
    }

    const access = await resolveFeatureUpdateAccess(req, normalizedShopId);
    if (access.error) {
      return res.status(access.error.status).json(access.error.body);
    }

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $set: featureUpdates },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    res.status(200).json({
      success: true,
      shopId: updated.shopId,
      message: 'Shop SMS settings updated',
      features: mapShopSmsFeaturesResponse(updated),
    });
  } catch (error) {
    console.log('error in updateShopSmsFeatures', error);
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
  getShopModuleFeatures,
  getShopUsersFeatures,
  getShopSmsFeatures,
  getSmsPackages,
  onboardingShopFeatures,
  updateShopModuleFeatures,
  updateShopUsersFeatures,
  updateShopSmsFeatures,
  setSubscription,
  removeOnboardingData,
};