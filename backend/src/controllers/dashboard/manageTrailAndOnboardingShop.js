const ShopsData = require('../../models/shopsData');
const { resolveQuotationsModule, applyQuotationsModuleUpdate } = require('../../utils/industryHelper');
const {
  finishTrialManually,
  getTrialSecondsRemaining,
} = require('../../utils/trialHelper');
const { clearShopUserTokens } = require('../../services/trialExpirationService');

const TRIAL_SHOP_STATUSES = ['trial', 'trialExpired'];

const TRIAL_SHOP_LIST_FIELDS = [
  'shopId',
  'shopName',
  'ownerFirstName',
  'ownerLastName',
  'ownerMobileNumber',
  'shopMobileNumber',
  'status',
  'isTrailStared',
  'isTrailCompleted',
  'trailStartDate',
  'trailEndDate',
  'onboardStep',
  'createdAt',
  'updatedAt',
].join(' ');

const TRIAL_SHOP_DETAIL_FIELDS = [
  'shopId',
  'shopName',
  'address',
  'shopMobileNumber',
  'ownerFirstName',
  'ownerLastName',
  'ownerMobileNumber',
  'email',
  'status',
  'onboardStep',
  'isTrailStared',
  'isTrailCompleted',
  'trailStartDate',
  'trailEndDate',
  'oneTimePaymentAmount',
  'isOneTimePaymentDone',
  'isOneTimePaymentGenerated',
  'oneTimePaymentReceiptNo',
  'kpi',
  'analyticsModule',
  'customerManualOrder',
  'costModule',
  'marketingModule',
  'warrantyModule',
  'quotationsModule',
  'automotiveModule',
  'maxUsers',
  'createdAt',
  'updatedAt',
].join(' ');

const ONBOARDING_SHOP_LIST_FIELDS = [
  'shopId',
  'shopName',
  'shopMobileNumber',
  'ownerFirstName',
  'ownerLastName',
  'ownerMobileNumber',
  'oneTimePaymentAmount',
  'isOneTimePaymentGenerated',
  'isOneTimePaymentDone',
].join(' ');

const ONBOARDING_SHOP_DETAILS_FIELDS = [
  'shopName',
  'address',
  'shopMobileNumber',
  'ownerFirstName',
  'ownerLastName',
  'ownerMobileNumber',
  'email',
  'kpi',
  'analyticsModule',
  'customerManualOrder',
  'costModule',
  'marketingModule',
  'warrantyModule',
  'quotationsModule',
  'automotiveModule',
  'oneTimePaymentAmount',
  'isOneTimePaymentDone',
  'isOneTimePaymentGenerated',
  'oneTimePaymentReceiptNo',
  'shopId',
];

function formatTrialShopSummary(shop) {
  return {
    shopId: shop.shopId,
    shopName: shop.shopName,
    ownerFirstName: shop.ownerFirstName,
    ownerLastName: shop.ownerLastName,
    ownerMobileNumber: shop.ownerMobileNumber,
    shopMobileNumber: shop.shopMobileNumber,
    status: shop.status,
    isTrailStared: shop.isTrailStared,
    isTrailCompleted: shop.isTrailCompleted,
    trailStartDate: shop.trailStartDate,
    trailEndDate: shop.trailEndDate,
    trialSecondsRemaining: getTrialSecondsRemaining(shop),
    onboardStep: shop.onboardStep,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  };
}

function formatTrialShopDetails(shop) {
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
    trialSecondsRemaining: getTrialSecondsRemaining(shop),
    oneTimePaymentAmount: shop.oneTimePaymentAmount,
    isOneTimePaymentDone: shop.isOneTimePaymentDone,
    isOneTimePaymentGenerated: shop.isOneTimePaymentGenerated,
    oneTimePaymentReceiptNo: shop.oneTimePaymentReceiptNo,
    kpi: shop.kpi,
    analyticsModule: shop.analyticsModule,
    customerManualOrder: shop.customerManualOrder,
    costModule: shop.costModule,
    marketingModule: shop.marketingModule,
    warrantyModule: Boolean(shop.warrantyModule),
    quotationsModule: resolveQuotationsModule(shop),
    maxUsers: shop.maxUsers,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  };
}

function formatOnboardingShopSummary(shop) {
  return {
    shopId: shop.shopId,
    shopName: shop.shopName,
    shopMobileNumber: shop.shopMobileNumber,
    ownerFirstName: shop.ownerFirstName,
    ownerLastName: shop.ownerLastName,
    ownerMobileNumber: shop.ownerMobileNumber,
    oneTimePaymentAmount: shop.oneTimePaymentAmount,
    isOneTimePaymentGenerated: shop.isOneTimePaymentGenerated,
    isOneTimePaymentDone: shop.isOneTimePaymentDone,
  };
}

function formatOnboardingShopDetails(shop) {
  return {
    shopName: shop.shopName,
    address: shop.address,
    shopMobileNumber: shop.shopMobileNumber,
    ownerFirstName: shop.ownerFirstName,
    ownerLastName: shop.ownerLastName,
    ownerMobileNumber: shop.ownerMobileNumber,
    email: shop.email,
    kpi: shop.kpi,
    analyticsModule: shop.analyticsModule,
    customerManualOrder: shop.customerManualOrder,
    costModule: shop.costModule,
    marketingModule: shop.marketingModule,
    warrantyModule: Boolean(shop.warrantyModule),
    quotationsModule: resolveQuotationsModule(shop),
    oneTimePaymentAmount: shop.oneTimePaymentAmount,
    isOneTimePaymentDone: shop.isOneTimePaymentDone,
    isOneTimePaymentGenerated: shop.isOneTimePaymentGenerated,
    oneTimePaymentReceiptNo: shop.oneTimePaymentReceiptNo,
    shopId: shop.shopId,
  };
}

function normalizeShopId(value) {
  return value != null ? String(value).trim().toUpperCase() : '';
}

function normalizeOptionalString(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeRequiredString(value, fieldName, errors) {
  if (value == null || String(value).trim() === '') {
    errors.push(`${fieldName} is required`);
    return null;
  }
  return String(value).trim();
}

function normalizeBoolean(value, fieldName, errors) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  errors.push(`${fieldName} must be a boolean`);
  return undefined;
}

function buildOnboardingShopUpdate(body) {
  const errors = [];
  const update = {};

  if (Object.prototype.hasOwnProperty.call(body, 'shopName')) {
    const shopName = normalizeRequiredString(body.shopName, 'shopName', errors);
    if (shopName != null) update.shopName = shopName;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'address')) {
    const address = normalizeRequiredString(body.address, 'address', errors);
    if (address != null) update.address = address;
  }

  if (
    Object.prototype.hasOwnProperty.call(body, 'shopMobileNumber') ||
    Object.prototype.hasOwnProperty.call(body, 'shopMobile')
  ) {
    const shopMobileNumber = normalizeRequiredString(
      body.shopMobileNumber ?? body.shopMobile,
      'shopMobileNumber',
      errors,
    );
    if (shopMobileNumber != null) update.shopMobileNumber = shopMobileNumber;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    const email = normalizeOptionalString(body.email);
    update.email = email != null ? email.toLowerCase() : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'ownerFirstName')) {
    const ownerFirstName = normalizeRequiredString(
      body.ownerFirstName,
      'ownerFirstName',
      errors,
    );
    if (ownerFirstName != null) update.ownerFirstName = ownerFirstName;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'ownerLastName')) {
    const ownerLastName = normalizeRequiredString(
      body.ownerLastName,
      'ownerLastName',
      errors,
    );
    if (ownerLastName != null) update.ownerLastName = ownerLastName;
  }

  if (
    Object.prototype.hasOwnProperty.call(body, 'ownerMobileNumber') ||
    Object.prototype.hasOwnProperty.call(body, 'ownerMobile')
  ) {
    const ownerMobileNumber = normalizeRequiredString(
      body.ownerMobileNumber ?? body.ownerMobile,
      'ownerMobileNumber',
      errors,
    );
    if (ownerMobileNumber != null) update.ownerMobileNumber = ownerMobileNumber;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'oneTimePaymentAmount')) {
    if (body.oneTimePaymentAmount === null || body.oneTimePaymentAmount === '') {
      update.oneTimePaymentAmount = null;
    } else {
      const amount = Number(body.oneTimePaymentAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        errors.push('oneTimePaymentAmount must be a number greater than or equal to 0');
      } else {
        update.oneTimePaymentAmount = amount;
      }
    }
  }

  const moduleFields = [
    'kpi',
    'analyticsModule',
    'customerManualOrder',
    'costModule',
    'marketingModule',
    'warrantyModule',
  ];

  for (const field of moduleFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const normalized = normalizeBoolean(body[field], field, errors);
      if (normalized !== undefined) {
        update[field] = normalized;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'quotationsModule')) {
    const quotationsModule = normalizeBoolean(body.quotationsModule, 'quotationsModule', errors);
    if (quotationsModule !== undefined) {
      applyQuotationsModuleUpdate(update, quotationsModule);
    }
  }

  return { update, errors };
}

const getOnboardUsers = async (req, res) => {
  try {
    const shops = await ShopsData.find({
      status: 'disabled',
      onboardStep: 'completed',
    })
      .select(ONBOARDING_SHOP_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: shops.length,
      shops: shops.map(formatOnboardingShopSummary),
    });
  } catch (error) {
    console.log('error in getOnboardUsers', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOnboardingShopDetails = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId);

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    const shop = await ShopsData.findOne({ shopId })
      .select(ONBOARDING_SHOP_DETAILS_FIELDS.join(' '))
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    res.status(200).json({
      success: true,
      shop: formatOnboardingShopDetails(shop),
    });
  } catch (error) {
    console.log('error in getOnboardingShopDetails', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOnboardingShop = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId);

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    const { update, errors } = buildOnboardingShopUpdate(req.body || {});

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided to update',
      });
    }

    const existingShop = await ShopsData.findOne({ shopId }).select('shopId').lean();
    if (!existingShop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    if (update.ownerMobileNumber) {
      const duplicateOwnerMobile = await ShopsData.findOne({
        ownerMobileNumber: update.ownerMobileNumber,
        shopId: { $ne: shopId },
      })
        .select('shopId')
        .lean();

      if (duplicateOwnerMobile) {
        return res.status(400).json({
          success: false,
          message: 'Owner mobile number is already registered to another shop',
        });
      }
    }

    const shop = await ShopsData.findOneAndUpdate(
      { shopId },
      { $set: update },
      {
        new: true,
        runValidators: true,
        strict: Object.prototype.hasOwnProperty.call(update, 'automotiveModule.quotations')
          ? false
          : true,
      },
    )
      .select(ONBOARDING_SHOP_DETAILS_FIELDS.join(' '))
      .lean();

    res.status(200).json({
      success: true,
      message: 'Shop updated successfully',
      shop: formatOnboardingShopDetails(shop),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Owner mobile number is already registered to another shop',
      });
    }

    console.log('error in updateOnboardingShop', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTrialShops = async (req, res) => {
  try {
    const statusRaw = req.query?.status ? String(req.query.status).trim() : '';
    const filter = {};

    if (statusRaw) {
      const normalizedStatus = statusRaw.toLowerCase();
      if (!TRIAL_SHOP_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${TRIAL_SHOP_STATUSES.join(', ')}`,
        });
      }
      filter.status = normalizedStatus;
    } else {
      filter.status = { $in: TRIAL_SHOP_STATUSES };
    }

    const shops = await ShopsData.find(filter)
      .select(TRIAL_SHOP_LIST_FIELDS)
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: shops.length,
      shops: shops.map(formatTrialShopSummary),
    });
  } catch (error) {
    console.log('error in getTrialShops', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTrialShopDetails = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId);

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    const shop = await ShopsData.findOne({
      shopId,
      status: { $in: TRIAL_SHOP_STATUSES },
    })
      .select(TRIAL_SHOP_DETAIL_FIELDS)
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Trial shop not found',
      });
    }

    res.status(200).json({
      success: true,
      shop: formatTrialShopDetails(shop),
    });
  } catch (error) {
    console.log('error in getTrialShopDetails', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const finishTrialShop = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId);

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    let shop = await ShopsData.findOne({ shopId });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    if (shop.status === 'trialExpired' && shop.isTrailCompleted) {
      const clearedUserTokens = await clearShopUserTokens(shopId);
      return res.status(200).json({
        success: true,
        message: 'Trial is already finished',
        shop: formatTrialShopDetails(shop),
        trialExpired: true,
        sessionEnded: true,
        clearedUserTokens,
      });
    }

    if (!shop.isTrailStared || shop.status !== 'trial') {
      return res.status(400).json({
        success: false,
        message:
          'No active trial to finish. Shop must have status trial and a started trial.',
        shopId: shop.shopId,
        status: shop.status,
        isTrailStared: shop.isTrailStared,
      });
    }

    shop = await finishTrialManually(shop);
    const clearedUserTokens = await clearShopUserTokens(shopId);

    res.status(200).json({
      success: true,
      message: 'Trial finished successfully',
      shop: formatTrialShopDetails(shop),
      trialExpired: true,
      sessionEnded: true,
      clearedUserTokens,
    });
  } catch (error) {
    console.log('error in finishTrialShop', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  // getOnboardUsers: Get all users who have completed the onboarding process
  getOnboardUsers,
  getOnboardingShopDetails,
  updateOnboardingShop,

  // getTrialShops: Get all trial shops
  getTrialShops,
  // getTrialShopDetails: Get details of a trial shop
  getTrialShopDetails,
  // finishTrialShop: Finish a trial shop
  finishTrialShop,
};
