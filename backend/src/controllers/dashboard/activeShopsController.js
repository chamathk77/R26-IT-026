const ShopsData = require('../../models/shopsData');
const Payments = require('../../models/payments');
const Branch = require('../../models/branch');
const { deleteAllShopScopedData } = require('../../utils/deleteShopDataHelper');
const { formatIndustryFieldsForClient } = require('../../utils/industryHelper');
const { formatPaymentRecord } = require('../../utils/paymentResponseHelper');
const mongoose = require('mongoose');

const { PAYMENT_STATUS, PAYMENT_TYPE } = Payments;
const { SHOP_STATUS, SUBSCRIPTION_TYPES, SMS_PACKAGE_TYPES } = ShopsData;
const EDITABLE_PAYMENT_STATUSES = ['notPaid', 'rejected'];
const SMS_FEATURE_STATUSES = ['notActivated', 'active', 'pending', 'due', 'inactive'];

function isDashboardAdminRole(role) {
  return role === 'admin';
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function canEditPaymentStatus(status) {
  return EDITABLE_PAYMENT_STATUSES.includes(status);
}

/** Shops considered “live / in billing flow” for active-user management. */
const ACTIVE_SHOP_STATUSES = [
  'active',
  'due',
  'paymentPending',
  'changeSubscription',
  'initialPaymentApproved',
  'subscriptionPaymentPending',
];

const ACTIVE_SHOP_LIST_FIELDS = [
  'shopId',
  'shopName',
  'address',
  'shopMobileNumber',
  'ownerFirstName',
  'ownerLastName',
  'ownerMobileNumber',
  'email',
  'status',
  'subscriptionType',
  'nextPaymentDate',
  'maxUsers',
  'onboardStep',
  'createdAt',
  'updatedAt',
].join(' ');

const ACTIVE_SHOP_DETAIL_FIELDS = [
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
  'subscriptionType',
  'subscriptionStartDate',
  'currentPaymentDoneDate',
  'nextPaymentDate',
  'subsAmount',
  'subscriptionReceiptNo',
  'subscriptionDueDays',
  'isSubscriptionChangePending',
  'oneTimePaymentAmount',
  'isOneTimePaymentDone',
  'isOneTimePaymentGenerated',
  'oneTimePaymentReceiptNo',
  'kpi',
  'analyticsModule',
  'customerManualOrder',
  'costModule',
  'marketingModule',
  'webModule',
  'webModuleEnabledAt',
  'industryType',
  'restaurantModule',
  'salonModule',
  'automotiveModule',
  'maxUsers',
  'isAdditionalUsersAdded',
  'numAdditionalUsers',
  'smsfeature',
  'isTrailStared',
  'isTrailCompleted',
  'trailStartDate',
  'trailEndDate',
  'createdAt',
  'updatedAt',
].join(' ');

function normalizeShopId(value) {
  return value != null ? String(value).trim().toUpperCase() : '';
}

function normalizeOptionalString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeNullableString(value) {
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

function normalizeDate(value, fieldName, errors) {
  if (value === null || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${fieldName} must be a valid date`);
    return undefined;
  }
  return parsed;
}

function normalizeNonNegativeNumber(value, fieldName, errors) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    errors.push(`${fieldName} must be a number greater than or equal to 0`);
    return undefined;
  }
  return num;
}

function buildActiveShopUpdate(body) {
  const errors = [];
  const update = {};

  const profileFields = [
    'shopName',
    'address',
    'shopMobileNumber',
    'ownerFirstName',
    'ownerLastName',
  ];

  for (const field of profileFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const normalized = normalizeRequiredString(body[field], field, errors);
      if (normalized != null) update[field] = normalized;
    }
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

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    const email = normalizeNullableString(body.email);
    update.email = email != null ? email.toLowerCase() : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    const status = normalizeRequiredString(body.status, 'status', errors);
    if (status != null) {
      if (!SHOP_STATUS.includes(status)) {
        errors.push(`status must be one of: ${SHOP_STATUS.join(', ')}`);
      } else {
        update.status = status;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'subscriptionType')) {
    if (body.subscriptionType === null || body.subscriptionType === '') {
      update.subscriptionType = null;
    } else {
      const subscriptionType = String(body.subscriptionType).trim();
      if (!SUBSCRIPTION_TYPES.includes(subscriptionType)) {
        errors.push(`subscriptionType must be one of: ${SUBSCRIPTION_TYPES.join(', ')}`);
      } else {
        update.subscriptionType = subscriptionType;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'nextPaymentDate')) {
    const nextPaymentDate = normalizeDate(body.nextPaymentDate, 'nextPaymentDate', errors);
    if (nextPaymentDate !== undefined) update.nextPaymentDate = nextPaymentDate;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'subscriptionDueDays')) {
    const subscriptionDueDays = normalizeNonNegativeNumber(
      body.subscriptionDueDays,
      'subscriptionDueDays',
      errors,
    );
    if (subscriptionDueDays !== undefined) update.subscriptionDueDays = subscriptionDueDays;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'isSubscriptionChangePending')) {
    const isSubscriptionChangePending = normalizeBoolean(
      body.isSubscriptionChangePending,
      'isSubscriptionChangePending',
      errors,
    );
    if (isSubscriptionChangePending !== undefined) {
      update.isSubscriptionChangePending = isSubscriptionChangePending;
    }
  }

  const moduleBooleanFields = [
    'kpi',
    'analyticsModule',
    'customerManualOrder',
    'costModule',
    'marketingModule',
    'isAdditionalUsersAdded',
    'webModule',
  ];

  for (const field of moduleBooleanFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const normalized = normalizeBoolean(body[field], field, errors);
      if (normalized !== undefined) update[field] = normalized;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'maxUsers')) {
    const maxUsers = normalizeNonNegativeNumber(body.maxUsers, 'maxUsers', errors);
    if (maxUsers !== undefined && maxUsers >= 1) {
      update.maxUsers = maxUsers;
    } else if (maxUsers !== undefined && maxUsers < 1) {
      errors.push('maxUsers must be at least 1');
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'numAdditionalUsers')) {
    if (body.numAdditionalUsers === null || body.numAdditionalUsers === '') {
      update.numAdditionalUsers = null;
    } else {
      const numAdditionalUsers = normalizeNonNegativeNumber(
        body.numAdditionalUsers,
        'numAdditionalUsers',
        errors,
      );
      if (numAdditionalUsers !== undefined) update.numAdditionalUsers = numAdditionalUsers;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'webModuleEnabledAt')) {
    const webModuleEnabledAt = normalizeDate(
      body.webModuleEnabledAt,
      'webModuleEnabledAt',
      errors,
    );
    if (webModuleEnabledAt !== undefined) update.webModuleEnabledAt = webModuleEnabledAt;
  }

  const smsBody =
    body.smsfeature && typeof body.smsfeature === 'object' ? body.smsfeature : body;

  if (Object.prototype.hasOwnProperty.call(smsBody, 'senderId')) {
    update['smsfeature.senderId'] = normalizeNullableString(smsBody.senderId);
  }

  if (Object.prototype.hasOwnProperty.call(smsBody, 'smsUsedInPeriod')) {
    const smsUsedInPeriod = normalizeNonNegativeNumber(
      smsBody.smsUsedInPeriod,
      'smsUsedInPeriod',
      errors,
    );
    if (smsUsedInPeriod !== undefined) update['smsfeature.smsUsedInPeriod'] = smsUsedInPeriod;
  }

  if (Object.prototype.hasOwnProperty.call(smsBody, 'isSmsFeatureActive')) {
    const isSmsFeatureActive = normalizeBoolean(
      smsBody.isSmsFeatureActive,
      'isSmsFeatureActive',
      errors,
    );
    if (isSmsFeatureActive !== undefined) {
      update['smsfeature.isSmsFeatureActive'] = isSmsFeatureActive;
    }
  }

  if (Object.prototype.hasOwnProperty.call(smsBody, 'smsFeatureStatus')) {
    const smsFeatureStatus = normalizeRequiredString(
      smsBody.smsFeatureStatus,
      'smsFeatureStatus',
      errors,
    );
    if (smsFeatureStatus != null) {
      if (!SMS_FEATURE_STATUSES.includes(smsFeatureStatus)) {
        errors.push(`smsFeatureStatus must be one of: ${SMS_FEATURE_STATUSES.join(', ')}`);
      } else {
        update['smsfeature.smsFeatureStatus'] = smsFeatureStatus;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(smsBody, 'smsNextRenewalDate')) {
    const smsNextRenewalDate = normalizeDate(
      smsBody.smsNextRenewalDate,
      'smsNextRenewalDate',
      errors,
    );
    if (smsNextRenewalDate !== undefined) {
      update['smsfeature.smsNextRenewalDate'] = smsNextRenewalDate;
    }
  }

  if (Object.prototype.hasOwnProperty.call(smsBody, 'smsDueDays')) {
    const smsDueDays = normalizeNonNegativeNumber(smsBody.smsDueDays, 'smsDueDays', errors);
    if (smsDueDays !== undefined) update['smsfeature.smsDueDays'] = smsDueDays;
  }

  if (Object.prototype.hasOwnProperty.call(smsBody, 'isSmsDeactivationScheduled')) {
    const isSmsDeactivationScheduled = normalizeBoolean(
      smsBody.isSmsDeactivationScheduled,
      'isSmsDeactivationScheduled',
      errors,
    );
    if (isSmsDeactivationScheduled !== undefined) {
      update['smsfeature.isSmsDeactivationScheduled'] = isSmsDeactivationScheduled;
    }
  }

  return { update, errors };
}

function formatSmsFeature(sms) {
  if (!sms || typeof sms !== 'object') {
    return {
      senderId: null,
      smsPackageType: null,
      smsUsedInPeriod: 0,
      isSmsFeatureActive: false,
      smsFeatureStatus: 'notActivated',
      smsNextRenewalDate: null,
      smsDueDays: 0,
      smsReceiptNo: null,
      isSmsDeactivationScheduled: false,
    };
  }

  return {
    senderId: sms.senderId ?? null,
    smsPackageType: sms.smsPackageType ?? null,
    smsUsedInPeriod: sms.smsUsedInPeriod ?? 0,
    isSmsFeatureActive: Boolean(sms.isSmsFeatureActive),
    smsFeatureStatus: sms.smsFeatureStatus ?? 'notActivated',
    smsNextRenewalDate: sms.smsNextRenewalDate ?? null,
    smsDueDays: sms.smsDueDays ?? 0,
    smsReceiptNo: sms.smsReceiptNo ?? null,
    isSmsDeactivationScheduled: Boolean(sms.isSmsDeactivationScheduled),
  };
}

function formatActiveShopSummary(shop) {
  return {
    shopId: shop.shopId,
    shopName: shop.shopName,
    address: shop.address,
    shopMobileNumber: shop.shopMobileNumber,
    ownerFirstName: shop.ownerFirstName,
    ownerLastName: shop.ownerLastName,
    ownerMobileNumber: shop.ownerMobileNumber,
    email: shop.email ?? null,
    status: shop.status,
    subscriptionType: shop.subscriptionType ?? null,
    nextPaymentDate: shop.nextPaymentDate ?? null,
    maxUsers: shop.maxUsers ?? null,
    onboardStep: shop.onboardStep ?? null,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  };
}

function formatActiveShopDetails(shop) {
  return {
    shopId: shop.shopId,
    shopName: shop.shopName,
    address: shop.address,
    shopMobileNumber: shop.shopMobileNumber,
    ownerFirstName: shop.ownerFirstName,
    ownerLastName: shop.ownerLastName,
    ownerMobileNumber: shop.ownerMobileNumber,
    email: shop.email ?? null,
    status: shop.status,
    onboardStep: shop.onboardStep ?? null,
    subscriptionType: shop.subscriptionType ?? null,
    subscriptionStartDate: shop.subscriptionStartDate ?? null,
    currentPaymentDoneDate: shop.currentPaymentDoneDate ?? null,
    nextPaymentDate: shop.nextPaymentDate ?? null,
    subsAmount: shop.subsAmount ?? null,
    subscriptionReceiptNo: shop.subscriptionReceiptNo ?? null,
    subscriptionDueDays: shop.subscriptionDueDays ?? 0,
    isSubscriptionChangePending: Boolean(shop.isSubscriptionChangePending),
    oneTimePaymentAmount: shop.oneTimePaymentAmount ?? null,
    isOneTimePaymentDone: Boolean(shop.isOneTimePaymentDone),
    isOneTimePaymentGenerated: Boolean(shop.isOneTimePaymentGenerated),
    oneTimePaymentReceiptNo: shop.oneTimePaymentReceiptNo ?? null,
    kpi: Boolean(shop.kpi),
    analyticsModule: Boolean(shop.analyticsModule),
    customerManualOrder: Boolean(shop.customerManualOrder),
    costModule: Boolean(shop.costModule),
    marketingModule: Boolean(shop.marketingModule),
    webModule: Boolean(shop.webModule),
    webModuleEnabledAt: shop.webModuleEnabledAt ?? null,
    ...formatIndustryFieldsForClient(shop),
    maxUsers: shop.maxUsers ?? null,
    isAdditionalUsersAdded: Boolean(shop.isAdditionalUsersAdded),
    numAdditionalUsers: shop.numAdditionalUsers ?? null,
    smsfeature: formatSmsFeature(shop.smsfeature),
    isTrailStared: Boolean(shop.isTrailStared),
    isTrailCompleted: Boolean(shop.isTrailCompleted),
    trailStartDate: shop.trailStartDate ?? null,
    trailEndDate: shop.trailEndDate ?? null,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  };
}

/**
 * GET /api/dashboard/shops/active-shops
 *
 * Query:
 * - status: optional, one of ACTIVE_SHOP_STATUSES (default: all of them)
 * - ownerMobileNumber: optional exact match (trimmed)
 * - shopId: optional (normalized uppercase)
 */
const getActiveShops = async (req, res) => {
  try {
    const statusRaw = normalizeOptionalString(req.query?.status);
    const ownerMobileRaw = normalizeOptionalString(
      req.query?.ownerMobileNumber ?? req.query?.ownerMobile,
    );
    const shopIdRaw = normalizeShopId(req.query?.shopId);

    const filter = {};

    if (statusRaw) {
      if (!ACTIVE_SHOP_STATUSES.includes(statusRaw)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${ACTIVE_SHOP_STATUSES.join(', ')}`,
        });
      }
      filter.status = statusRaw;
    } else {
      filter.status = { $in: ACTIVE_SHOP_STATUSES };
    }

    if (ownerMobileRaw) {
      filter.ownerMobileNumber = ownerMobileRaw;
    }

    if (shopIdRaw) {
      filter.shopId = shopIdRaw;
    }

    const shops = await ShopsData.find(filter)
      .select(ACTIVE_SHOP_LIST_FIELDS)
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: shops.length,
      filters: {
        status: statusRaw || null,
        ownerMobileNumber: ownerMobileRaw || null,
        shopId: shopIdRaw || null,
      },
      allowedStatuses: ACTIVE_SHOP_STATUSES,
      shops: shops.map(formatActiveShopSummary),
    });
  } catch (error) {
    console.log('error in getActiveShops', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/dashboard/shops/active-shops/:shopId
 *
 * Returns mapped detail fields for a shop in an active billing status.
 */
const getActiveShopDetails = async (req, res) => {
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
      status: { $in: ACTIVE_SHOP_STATUSES },
    })
      .select(ACTIVE_SHOP_DETAIL_FIELDS)
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Active shop not found',
      });
    }

    res.status(200).json({
      success: true,
      shop: formatActiveShopDetails(shop),
      canEdit: isDashboardAdminRole(req.user?.role),
      allowedStatuses: SHOP_STATUS,
      allowedSubscriptionTypes: SUBSCRIPTION_TYPES,
      allowedSmsPackageTypes: SMS_PACKAGE_TYPES,
      allowedSmsFeatureStatuses: SMS_FEATURE_STATUSES,
    });
  } catch (error) {
    console.log('error in getActiveShopDetails', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/dashboard/shops/active-shops/:shopId
 *
 * Admin-only. Updates editable active shop profile, subscription, SMS, and module fields.
 */
const updateActiveShopDetails = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId);

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    const { update, errors } = buildActiveShopUpdate(req.body || {});

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
      },
    )
      .select(ACTIVE_SHOP_DETAIL_FIELDS)
      .lean();

    res.status(200).json({
      success: true,
      message: 'Shop updated successfully',
      shop: formatActiveShopDetails(shop),
      canEdit: true,
      allowedStatuses: SHOP_STATUS,
      allowedSubscriptionTypes: SUBSCRIPTION_TYPES,
      allowedSmsPackageTypes: SMS_PACKAGE_TYPES,
      allowedSmsFeatureStatuses: SMS_FEATURE_STATUSES,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Owner mobile number is already registered to another shop',
      });
    }

    console.log('error in updateActiveShopDetails', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/dashboard/shops/active-shops/:shopId/clear-data
 *
 * Permanently deletes this shop’s records from shop-scoped collections and
 * removes the shopId from cron report entries. Irreversible.
 */
const clearActiveShopData = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId);
    const confirmShopId = normalizeShopId(req.body?.confirmShopId);

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    if (!confirmShopId || confirmShopId !== shopId) {
      return res.status(400).json({
        success: false,
        message: 'confirmShopId must match the shop id exactly',
      });
    }

    const shop = await ShopsData.findOne({
      shopId,
      status: { $in: ACTIVE_SHOP_STATUSES },
    })
      .select('shopId shopName status')
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Active shop not found',
      });
    }

    const { deleted, cronReportsScrubbed } = await deleteAllShopScopedData(shopId);

    res.status(200).json({
      success: true,
      message: 'All shop user data cleared successfully',
      shopId,
      shopName: shop.shopName,
      deleted,
      cronReportsScrubbed,
    });
  } catch (error) {
    console.log('error in clearActiveShopData', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function normalizePaymentTypeFilter(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { paymentType: null };
  }

  const normalized = String(value).trim();
  if (normalized === 'upfront') {
    return { paymentType: 'upFront' };
  }
  if (PAYMENT_TYPE.includes(normalized)) {
    return { paymentType: normalized };
  }

  return {
    error: `paymentType must be one of: ${PAYMENT_TYPE.join(', ')}`,
  };
}

function normalizePaymentStatusFilter(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { status: null };
  }

  const normalized = String(value).trim();
  if (PAYMENT_STATUS.includes(normalized)) {
    return { status: normalized };
  }

  return {
    error: `status must be one of: ${PAYMENT_STATUS.join(', ')}`,
  };
}

function mapActiveShopPaymentItem(payment, req) {
  const formatted = formatPaymentRecord(payment, req);
  return {
    _id: formatted._id,
    shopId: formatted.shopId,
    receiptNumber: formatted.receiptNumber,
    receiptImagePath: formatted.receiptImagePath,
    receiptImageUrl: formatted.receiptImageUrl,
    receiptImageAvailable: formatted.receiptImageAvailable,
    paymentType: formatted.paymentType,
    paymentAmount: formatted.paymentAmount ?? null,
    additionalPayments: formatted.additionalPayments ?? [],
    subscriptionType: formatted.subscriptionType ?? null,
    IsOnboaringPayment: Boolean(formatted.IsOnboaringPayment),
    submittedDate: formatted.submittedDate ?? null,
    paymentMonth: formatted.paymentMonth ?? null,
    exactPaymentDay: formatted.exactPaymentDay ?? null,
    expiryDate: formatted.expiryDate ?? null,
    status: formatted.status,
    reason: formatted.reason ?? null,
    description: formatted.description ?? null,
    createdAt: formatted.createdAt,
    updatedAt: formatted.updatedAt,
  };
}

/**
 * GET /api/dashboard/shops/active-shops/:shopId/branches
 */
const getActiveShopBranches = async (req, res) => {
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
      status: { $in: ACTIVE_SHOP_STATUSES },
    })
      .select('shopId shopName status industryType')
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Active shop not found',
      });
    }

    const branches = await Branch.find({ shopId })
      .sort({ isMainBranch: -1, isActive: -1, branchName: 1, createdAt: 1 })
      .lean();

    const mapped = branches.map((branch) => ({
      _id: String(branch._id),
      shopId: branch.shopId,
      branchId: branch.branchId,
      branchName: branch.branchName,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
      isMainBranch: Boolean(branch.isMainBranch),
      isActive: Boolean(branch.isActive),
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: mapped.length,
      activeCount: mapped.filter((branch) => branch.isActive).length,
      inactiveCount: mapped.filter((branch) => !branch.isActive).length,
      shop: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        status: shop.status,
        industryType: shop.industryType ?? 'retail',
      },
      branches: mapped,
    });
  } catch (error) {
    console.log('error in getActiveShopBranches', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/dashboard/shops/active-shops/:shopId/payments
 *
 * Query:
 * - paymentType: optional subscription | upFront | sms
 * - status: optional pending | approve | rejected | notPaid
 */
const getActiveShopPayments = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId);

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    const typeFilter = normalizePaymentTypeFilter(req.query?.paymentType);
    if (typeFilter.error) {
      return res.status(400).json({
        success: false,
        message: typeFilter.error,
        allowedPaymentTypes: PAYMENT_TYPE,
      });
    }

    const statusFilter = normalizePaymentStatusFilter(req.query?.status);
    if (statusFilter.error) {
      return res.status(400).json({
        success: false,
        message: statusFilter.error,
        allowedStatuses: PAYMENT_STATUS,
      });
    }

    const shop = await ShopsData.findOne({
      shopId,
      status: { $in: ACTIVE_SHOP_STATUSES },
    })
      .select('shopId shopName status subscriptionType')
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Active shop not found',
      });
    }

    const query = { shopId };
    if (typeFilter.paymentType) {
      query.paymentType = typeFilter.paymentType;
    }
    if (statusFilter.status) {
      query.status = statusFilter.status;
    }

    const [payments, allForCounts] = await Promise.all([
      Payments.find(query).sort({ createdAt: -1 }).lean(),
      Payments.find({ shopId }).select('paymentType status').lean(),
    ]);

    const mapped = payments.map((payment) => mapActiveShopPaymentItem(payment, req));

    const countsByStatus = PAYMENT_STATUS.reduce((acc, status) => {
      acc[status] = allForCounts.filter((p) => p.status === status).length;
      return acc;
    }, {});

    const countsByType = PAYMENT_TYPE.reduce((acc, type) => {
      acc[type] = allForCounts.filter((p) => p.paymentType === type).length;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: mapped.length,
      totalForShop: allForCounts.length,
      shop: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        status: shop.status,
        subscriptionType: shop.subscriptionType ?? null,
      },
      filters: {
        paymentType: typeFilter.paymentType,
        status: statusFilter.status,
      },
      allowedPaymentTypes: PAYMENT_TYPE,
      allowedStatuses: PAYMENT_STATUS,
      countsByStatus,
      countsByType,
      payments: mapped,
    });
  } catch (error) {
    console.log('error in getActiveShopPayments', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/dashboard/shops/active-shops/:shopId/payments/:paymentId
 */
const getActiveShopPaymentDetails = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId);
    const paymentId = String(req.params.paymentId || '').trim();

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    if (!paymentId || !isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment id is required',
      });
    }

    const shop = await ShopsData.findOne({
      shopId,
      status: { $in: ACTIVE_SHOP_STATUSES },
    })
      .select('shopId shopName status')
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Active shop not found',
      });
    }

    const payment = await Payments.findOne({ _id: paymentId, shopId }).lean();
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found for this shop',
      });
    }

    const mapped = mapActiveShopPaymentItem(payment, req);

    res.status(200).json({
      success: true,
      shop: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        status: shop.status,
      },
      payment: mapped,
      canEdit: canEditPaymentStatus(mapped.status),
      editableStatuses: EDITABLE_PAYMENT_STATUSES,
    });
  } catch (error) {
    console.log('error in getActiveShopPaymentDetails', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/dashboard/shops/active-shops/:shopId/payments/:paymentId
 *
 * Updates payment amount (and optional description) only when status is notPaid or rejected.
 */
const updateActiveShopPayment = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId);
    const paymentId = String(req.params.paymentId || '').trim();

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    if (!paymentId || !isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment id is required',
      });
    }

    const shop = await ShopsData.findOne({
      shopId,
      status: { $in: ACTIVE_SHOP_STATUSES },
    })
      .select('shopId shopName status')
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Active shop not found',
      });
    }

    const payment = await Payments.findOne({ _id: paymentId, shopId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found for this shop',
      });
    }

    if (!canEditPaymentStatus(payment.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment can only be updated when status is ${EDITABLE_PAYMENT_STATUSES.join(' or ')}`,
        status: payment.status,
        editableStatuses: EDITABLE_PAYMENT_STATUSES,
      });
    }

    const body = req.body || {};
    const hasAmount = Object.prototype.hasOwnProperty.call(body, 'paymentAmount');
    const hasDescription = Object.prototype.hasOwnProperty.call(body, 'description');

    if (!hasAmount && !hasDescription) {
      return res.status(400).json({
        success: false,
        message: 'Provide paymentAmount and/or description to update',
      });
    }

    if (hasAmount) {
      const amount = Number(body.paymentAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({
          success: false,
          message: 'paymentAmount must be a number greater than or equal to 0',
        });
      }
      payment.paymentAmount = amount;
    }

    if (hasDescription) {
      const description =
        body.description == null ? null : String(body.description).trim();
      payment.description = description === '' ? null : description;
    }

    await payment.save();

    const mapped = mapActiveShopPaymentItem(payment, req);

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      shop: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        status: shop.status,
      },
      payment: mapped,
      canEdit: canEditPaymentStatus(mapped.status),
      editableStatuses: EDITABLE_PAYMENT_STATUSES,
    });
  } catch (error) {
    console.log('error in updateActiveShopPayment', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/dashboard/shops/active-shops/:shopId/payments/:paymentId
 *
 * Deletes a payment only when status is notPaid or rejected.
 */
const deleteActiveShopPayment = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId);
    const paymentId = String(req.params.paymentId || '').trim();

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    if (!paymentId || !isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment id is required',
      });
    }

    const shop = await ShopsData.findOne({
      shopId,
      status: { $in: ACTIVE_SHOP_STATUSES },
    })
      .select('shopId shopName status')
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Active shop not found',
      });
    }

    const payment = await Payments.findOne({ _id: paymentId, shopId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found for this shop',
      });
    }

    if (!canEditPaymentStatus(payment.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment can only be deleted when status is ${EDITABLE_PAYMENT_STATUSES.join(' or ')}`,
        status: payment.status,
        editableStatuses: EDITABLE_PAYMENT_STATUSES,
      });
    }

    const snapshot = mapActiveShopPaymentItem(payment, req);
    await payment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully',
      shopId,
      paymentId,
      deletedPayment: snapshot,
    });
  } catch (error) {
    console.log('error in deleteActiveShopPayment', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  ACTIVE_SHOP_STATUSES,
  getActiveShops,
  getActiveShopDetails,
  updateActiveShopDetails,
  getActiveShopBranches,
  getActiveShopPayments,
  getActiveShopPaymentDetails,
  updateActiveShopPayment,
  deleteActiveShopPayment,
  clearActiveShopData,
};
