const ShopsData = require('../models/shopsData');
const User = require('../models/user');
const Payments = require('../models/payments');
const { addDays } = require('../utils/trialHelper');
const {
  generatePlanSubscriptionReceiptNumber,
  UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
} = require('../utils/paymentReceiptHelper');

const ONE_MONTH_SUBSCRIPTION = '1month';
const MULTI_MONTH_SUBSCRIPTION_TYPES = ['3months', '6months', '1year'];

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
  'shopId maxUsers isAdditionalUsersAdded numAdditionalUsers additionalUsersPendingChange status subscriptionType nextPaymentDate';

const SHOP_SMS_FEATURE_FIELDS =
  'shopId smsPackageType smsUsedInPeriod smsNextRenewalDate smsPackageAmount smsFeatureStatus';

const DEFAULT_MAX_USERS = 3;

function resolveMaxUsers(isAdditionalUsersAdded, numAdditionalUsers) {
  if (isAdditionalUsersAdded && numAdditionalUsers > 0) {
    return DEFAULT_MAX_USERS + numAdditionalUsers;
  }
  return DEFAULT_MAX_USERS;
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDaysUntilNextPayment(nextPaymentDate) {
  if (!nextPaymentDate) {
    return null;
  }

  const today = startOfDay();
  const dueDate = startOfDay(nextPaymentDate);
  const diffMs = dueDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function isInsideAdditionalUsersReductionCutoff(shop) {
  const subscriptionType = shop.subscriptionType;
  const cutoffDays = ShopsData.ADDITIONAL_USERS_REDUCTION_CUTOFF_DAYS[subscriptionType];

  if (!cutoffDays || !shop.nextPaymentDate) {
    return false;
  }

  const daysRemaining = getDaysUntilNextPayment(shop.nextPaymentDate);
  if (daysRemaining === null || daysRemaining < 0) {
    return false;
  }

  return daysRemaining <= cutoffDays;
}

function shouldScheduleAdditionalUsersReduction(shop) {
  if (shop.status === 'due' || shop.status === 'paymentPending') {
    return { required: true, reason: 'SUBSCRIPTION_PAYMENT_PENDING' };
  }

  if (shop.status === 'active') {
    if (isInsideAdditionalUsersReductionCutoff(shop)) {
      const cutoffDays =
        ShopsData.ADDITIONAL_USERS_REDUCTION_CUTOFF_DAYS[shop.subscriptionType] ?? null;
      return {
        required: true,
        reason: 'CUT_OFF_WINDOW',
        cutoffDays,
        daysUntilPayment: getDaysUntilNextPayment(shop.nextPaymentDate),
      };
    }
  }

  return { required: false };
}

function buildAdditionalUsersReductionScheduleMessage(scheduleCheck, shop) {
  if (scheduleCheck.reason === 'SUBSCRIPTION_PAYMENT_PENDING') {
    return (
      'A subscription payment is already in progress. ' +
      'You can schedule this reduction for your next billing cycle.'
    );
  }

  const cutoffDays = scheduleCheck.cutoffDays ?? 0;
  const daysUntilPayment = scheduleCheck.daysUntilPayment ?? 0;
  const dueLabel = shop.nextPaymentDate
    ? startOfDay(shop.nextPaymentDate).toISOString().slice(0, 10)
    : 'your next payment date';

  return (
    `You are within ${cutoffDays} days of your next payment (${dueLabel}, ${daysUntilPayment} day(s) remaining). ` +
    'Reducing additional users now would affect this bill. ' +
    'You can schedule this change for your next billing cycle instead.'
  );
}

function buildAdditionalUsersReductionScheduleBody(shop, featureUpdates, scheduleCheck) {
  return {
    success: false,
    code: 'ADDITIONAL_USERS_REDUCTION_REQUIRES_SCHEDULE',
    reason: scheduleCheck.reason,
    message: buildAdditionalUsersReductionScheduleMessage(scheduleCheck, shop),
    currentMaxUsers: shop.maxUsers,
    proposedMaxUsers: featureUpdates.maxUsers,
    currentNumAdditionalUsers: shop.numAdditionalUsers,
    proposedNumAdditionalUsers: featureUpdates.numAdditionalUsers,
    proposedIsAdditionalUsersAdded: featureUpdates.isAdditionalUsersAdded,
    shopStatus: shop.status,
    subscriptionType: shop.subscriptionType ?? null,
    nextPaymentDate: shop.nextPaymentDate ?? null,
    cutoffDays: scheduleCheck.cutoffDays ?? null,
    daysUntilPayment: scheduleCheck.daysUntilPayment ?? null,
  };
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

const getSubscriptionPlans = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Subscription plans loaded',
      subscriptions: ShopsData.buildSubscriptionPlansList(),
    });
  } catch (error) {
    console.log('error in getSubscriptionPlans', error);
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
    additionalUsersPendingChange: shop.additionalUsersPendingChange ?? null,
    nextPaymentDate: shop.nextPaymentDate ?? null,
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

    const shop = await ShopsData.findOne({ shopId: normalizedShopId })
      .select(SHOP_USERS_FEATURE_FIELDS)
      .lean();

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const proposedMaxUsers = featureUpdates.maxUsers;
    const isIncrease = proposedMaxUsers > shop.maxUsers;
    const isReduction = proposedMaxUsers < shop.maxUsers;

    const capacityCheck = await validateUserCapacityAgainstExistingUsers(
      normalizedShopId,
      proposedMaxUsers,
    );
    if (capacityCheck.error) {
      return res.status(capacityCheck.error.status).json(capacityCheck.error.body);
    }

    if (isReduction) {
      const scheduleCheck = shouldScheduleAdditionalUsersReduction(shop);
      if (scheduleCheck.required) {
        return res
          .status(409)
          .json(buildAdditionalUsersReductionScheduleBody(shop, featureUpdates, scheduleCheck));
      }
    }

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $set: featureUpdates, $unset: { additionalUsersPendingChange: '' } },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    return res.status(200).json({
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

const scheduleShopUsersFeaturesReduction = async (req, res) => {
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

    const shop = await ShopsData.findOne({ shopId: normalizedShopId })
      .select(SHOP_USERS_FEATURE_FIELDS)
      .lean();

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const proposedMaxUsers = featureUpdates.maxUsers;
    if (proposedMaxUsers >= shop.maxUsers) {
      return res.status(400).json({
        success: false,
        code: 'ADDITIONAL_USERS_INCREASE_NOT_SCHEDULABLE',
        message:
          proposedMaxUsers === shop.maxUsers
            ? 'No reduction to schedule. Your requested capacity matches the current limit.'
            : 'Increasing additional users cannot be scheduled. Use the regular update to apply increases immediately.',
      });
    }

    const capacityCheck = await validateUserCapacityAgainstExistingUsers(
      normalizedShopId,
      proposedMaxUsers,
    );
    if (capacityCheck.error) {
      return res.status(capacityCheck.error.status).json(capacityCheck.error.body);
    }

    const scheduleCheck = shouldScheduleAdditionalUsersReduction(shop);
    if (!scheduleCheck.required) {
      return res.status(400).json({
        success: false,
        code: 'ADDITIONAL_USERS_SCHEDULE_NOT_REQUIRED',
        message:
          'This reduction can be applied immediately. Use the regular update instead of scheduling.',
      });
    }

    const pendingChange = {
      isAdditionalUsersAdded: featureUpdates.isAdditionalUsersAdded,
      numAdditionalUsers: featureUpdates.numAdditionalUsers,
      requestedAt: new Date(),
    };

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $set: { additionalUsersPendingChange: pendingChange } },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    return res.status(200).json({
      success: true,
      shopId: updated.shopId,
      message:
        'Additional user reduction scheduled for your next billing cycle. Current capacity stays until your subscription payment is approved.',
      features: mapShopUsersFeaturesResponse(updated),
      pendingScheduled: true,
    });
  } catch (error) {
    console.log('error in scheduleShopUsersFeaturesReduction', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelShopUsersFeaturesReductionSchedule = async (req, res) => {
  try {
    const shopId = req.body.shopId ?? req.query.shopId ?? req.user?.shopId;

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

    const access = await resolveFeatureUpdateAccess(req, normalizedShopId);
    if (access.error) {
      return res.status(access.error.status).json(access.error.body);
    }

    const shop = await ShopsData.findOne({ shopId: normalizedShopId })
      .select(SHOP_USERS_FEATURE_FIELDS)
      .lean();

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (!shop.additionalUsersPendingChange) {
      return res.status(400).json({
        success: false,
        code: 'ADDITIONAL_USERS_SCHEDULE_NOT_FOUND',
        message: 'No scheduled additional user reduction found for this shop.',
      });
    }

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $unset: { additionalUsersPendingChange: '' } },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    return res.status(200).json({
      success: true,
      shopId: updated.shopId,
      message: 'Scheduled additional user reduction cancelled.',
      features: mapShopUsersFeaturesResponse(updated),
      pendingScheduled: false,
    });
  } catch (error) {
    console.log('error in cancelShopUsersFeaturesReductionSchedule', error);
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

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSubscriptionPlanLabel(subscriptionType) {
  const labels = {
    '1month': '1-month',
    '3months': '3-month',
    '6months': '6-month',
    '1year': '1-year',
  };
  return labels[subscriptionType] || subscriptionType;
}

function getFirstSubscriptionPaymentDescription(subscriptionType) {
  return `Subscription payment for ${getSubscriptionPlanLabel(subscriptionType)} plan. Please pay to activate your subscription.`;
}

function getSubscriptionExpiryDate(subscriptionType, billingDay) {
  const durationDays = ShopsData.SUBSCRIPTION_DURATION_DAYS[subscriptionType];
  if (!durationDays) {
    return null;
  }
  return startOfDay(addDays(startOfDay(billingDay), durationDays));
}

const setSubscription = async (req, res) => {
  try {
    const shopId = req.body.shopId ?? req.user?.shopId;
    const { subscriptionType } = req.body;

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

    const onboardStepUpdate =
      shop.onboardStep !== 'completed' ? { onboardStep: 'completed' } : {};

    if (normalizedSubscriptionType === ONE_MONTH_SUBSCRIPTION) {
      const subscriptionStartDate = startOfDay();
      const nextPaymentDate = startOfDay(addDays(subscriptionStartDate, 30));

      const updated = await ShopsData.findOneAndUpdate(
        { shopId: normalizedShopId },
        {
          $set: {
            subscriptionType: ONE_MONTH_SUBSCRIPTION,
            subscriptionStartDate,
            nextPaymentDate,
            status: 'active',
            ...onboardStepUpdate,
          },
        },
        { returnDocument: 'after', runValidators: true },
      ).lean();

      return res.status(200).json({
        success: true,
        shopId: updated.shopId,
        subscriptionType: updated.subscriptionType,
        subscriptionStartDate: updated.subscriptionStartDate,
        nextPaymentDate: updated.nextPaymentDate,
        status: updated.status,
        onboardStep: updated.onboardStep,
        message: '1-month subscription activated',
      });
    }

    if (!MULTI_MONTH_SUBSCRIPTION_TYPES.includes(normalizedSubscriptionType)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported subscription type: ${normalizedSubscriptionType}`,
      });
    }

    const baseFee = ShopsData.getSubscriptionFee(normalizedSubscriptionType);
    if (baseFee == null || baseFee <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Subscription fee is not configured for the selected plan',
        subscriptionType: normalizedSubscriptionType,
      });
    }

    const existingOpenInvoice = await Payments.findOne({
      shopId: normalizedShopId,
      paymentType: 'subscription',
      status: { $in: ['notPaid', 'pending'] },
    }).lean();

    if (existingOpenInvoice) {
      return res.status(400).json({
        success: false,
        message:
          'An open subscription invoice already exists. Please complete or cancel it before selecting a new plan.',
        paymentId: String(existingOpenInvoice._id),
        paymentStatus: existingOpenInvoice.status,
      });
    }

    const billingDay = startOfDay();
    const receiptNumber = await generatePlanSubscriptionReceiptNumber(billingDay);
    const expiryDate = getSubscriptionExpiryDate(normalizedSubscriptionType, billingDay);
    const description = getFirstSubscriptionPaymentDescription(normalizedSubscriptionType);

    const payment = await Payments.create({
      shopId: normalizedShopId,
      receiptNumber,
      receiptImagePath: UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
      paymentAmount: baseFee,
      additionalPayments: [],
      paymentType: 'subscription',
      subscriptionType: normalizedSubscriptionType,
      exactPaymentDay: billingDay,
      expiryDate,
      status: 'notPaid',
      description,
    });

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      {
        $set: {
          subscriptionType: normalizedSubscriptionType,
          status: 'subscriptionPaymentPending',
          subscriptionReceiptNo: String(payment._id),
          ...onboardStepUpdate,
        },
      },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    return res.status(200).json({
      success: true,
      shopId: updated.shopId,
      subscriptionType: updated.subscriptionType,
      status: updated.status,
      onboardStep: updated.onboardStep,
      subscriptionReceiptNo: updated.subscriptionReceiptNo,
      message: 'Subscription plan selected. Please pay the subscription invoice to activate.',
      payment: {
        _id: payment._id,
        shopId: payment.shopId,
        receiptNumber: payment.receiptNumber,
        paymentAmount: payment.paymentAmount,
        paymentType: payment.paymentType,
        subscriptionType: payment.subscriptionType,
        exactPaymentDay: payment.exactPaymentDay,
        expiryDate: payment.expiryDate,
        status: payment.status,
        description: payment.description,
      },
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
  /** Onboarding */
  createShopOnboarding,
  removeOnboardingData,
  onboardingShopFeatures,

  /** Features */
  updateShopModuleFeatures,
  updateShopUsersFeatures,
  scheduleShopUsersFeaturesReduction,
  cancelShopUsersFeaturesReductionSchedule,
  updateShopSmsFeatures,

  /** Get features */
  getShopModuleFeatures,
  getShopUsersFeatures,
  getShopSmsFeatures,
  getSmsPackages,
  getSubscriptionPlans,

  /** Subscription */
  setSubscription,
  
};