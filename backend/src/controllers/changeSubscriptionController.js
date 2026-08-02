const User = require('../models/user');
const ShopsData = require('../models/shopsData');
const {
  createChangeSubscriptionMultiMonthInvoice,
  isMultiMonthSubscriptionType,
} = require('../services/billingCheckService');

const FEATURE_UPDATE_ALLOWED_ROLES = new Set(['owner', 'admin']);

function normalizeShopId(value) {
  return value != null ? String(value).trim().toUpperCase() : '';
}

function isValidShopIdFormat(shopId) {
  return /^SI\d{6}$/.test(shopId);
}

function normalizeSubscriptionType(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!ShopsData.SUBSCRIPTION_TYPES.includes(normalized)) {
    return null;
  }
  return normalized;
}

function formatPaymentSummary(payment) {
  return {
    _id: String(payment._id),
    shopId: payment.shopId,
    receiptNumber: payment.receiptNumber,
    receiptImagePath: payment.receiptImagePath ?? 'pending-upload',
    submittedDate: payment.submittedDate ?? null,
    paymentMonth: payment.paymentMonth ?? null,
    paymentAmount: payment.paymentAmount,
    additionalPayments: payment.additionalPayments ?? [],
    paymentType: payment.paymentType,
    IsOnboaringPayment: payment.IsOnboaringPayment ?? false,
    subscriptionType: payment.subscriptionType,
    exactPaymentDay: payment.exactPaymentDay,
    expiryDate: payment.expiryDate ?? null,
    status: payment.status,
    description: payment.description ?? null,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function mapSelectNewSubscriptionError(result) {
  switch (result.error) {
    case 'shop_id_required':
      return {
        status: 400,
        body: { success: false, message: 'Shop id is required' },
      };
    case 'shop_not_found':
      return {
        status: 404,
        body: { success: false, message: 'Shop not found' },
      };
    case 'invalid_subscription_type':
      return {
        status: 400,
        body: {
          success: false,
          message: `subscriptionType must be one of: ${result.validTypes.join(', ')}`,
        },
      };
    case 'invalid_shop_status':
      return {
        status: 400,
        body: {
          success: false,
          message:
            'Shop must be in changeSubscription status to select a new plan',
          status: result.status,
        },
      };
    case 'subscription_fee_not_configured':
      return {
        status: 400,
        body: {
          success: false,
          message: 'Subscription fee is not configured for the selected plan',
          subscriptionType: result.subscriptionType ?? null,
        },
      };
    case 'open_invoice_exists':
      return {
        status: 400,
        body: {
          success: false,
          message:
            'An open subscription invoice already exists. Please complete or cancel it before selecting a new plan.',
          paymentId: result.paymentId ?? null,
          paymentStatus: result.paymentStatus ?? null,
        },
      };
    default:
      return null;
  }
}

const selectNewSubscripton = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.user?.shopId);
    const { subscriptionType } = req.body;

    if (!shopId) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }

    if (!isValidShopIdFormat(shopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }

    const user = await User.findById(req.user.id).select('role').lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    if (!FEATURE_UPDATE_ALLOWED_ROLES.has(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only shop owners and admins can change subscription plans.',
        code: 'SUBSCRIPTION_CHANGE_ROLE_FORBIDDEN',
      });
    }

    if (subscriptionType === undefined || subscriptionType === null || subscriptionType === '') {
      return res.status(400).json({
        success: false,
        message: 'subscriptionType is required',
      });
    }

    const normalizedSubscriptionType = normalizeSubscriptionType(subscriptionType);
    if (!normalizedSubscriptionType) {
      return res.status(400).json({
        success: false,
        message: `subscriptionType must be one of: ${ShopsData.SUBSCRIPTION_TYPES.join(', ')}`,
      });
    }

    if (isMultiMonthSubscriptionType(normalizedSubscriptionType)) {
      const shop = await ShopsData.findOne({ shopId })
        .select(
          'shopId status subscriptionType isAdditionalUsersAdded numAdditionalUsers nextPaymentDate ownerMobileNumber',
        )
        .lean();

      if (!shop) {
        return res.status(404).json({ success: false, message: 'Shop not found' });
      }

      if (shop.status !== 'changeSubscription') {
        return res.status(400).json({
          success: false,
          message: 'Shop must be in changeSubscription status to select a new plan',
          status: shop.status,
        });
      }

      const result = await createChangeSubscriptionMultiMonthInvoice(
        shop,
        normalizedSubscriptionType,
      );
      const mappedError = mapSelectNewSubscriptionError(result);
      if (mappedError) {
        return res.status(mappedError.status).json(mappedError.body);
      }

      const updatedShop = result.shop;
      const payment = result.payment;

      return res.status(200).json({
        success: true,
        shopId: updatedShop.shopId,
        subscriptionType: updatedShop.subscriptionType,
        status: updatedShop.status,
        nextPaymentDate: updatedShop.nextPaymentDate ?? null,
        subscriptionReceiptNo: updatedShop.subscriptionReceiptNo ?? null,
        subscriptionDueDays: updatedShop.subscriptionDueDays ?? 0,
        smsSent: result.smsSent === true,
        smsReason: result.smsReason ?? null,
        message:
          'Your subscription invoice has been sent. Please complete payment within 14 days.',
        payment: formatPaymentSummary(payment),
      });
    }

    const result = await ShopsData.selectNewSubscription(shopId, normalizedSubscriptionType);
    const mappedError = mapSelectNewSubscriptionError(result);
    if (mappedError) {
      return res.status(mappedError.status).json(mappedError.body);
    }

    const shop = result.shop;

    return res.status(200).json({
      success: true,
      shopId: shop.shopId,
      subscriptionType: shop.subscriptionType,
      status: shop.status,
      nextPaymentDate: shop.nextPaymentDate ?? null,
      message: '1-month subscription activated',
    });
  } catch (error) {
    console.log('error in selectNewSubscripton', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  selectNewSubscripton,
};
