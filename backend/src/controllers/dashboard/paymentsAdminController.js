const mongoose = require('mongoose');
const Payments = require('../../models/payments');
const ShopsData = require('../../models/shopsData');
const {
  formatPaymentRecord,
  formatShopSummary,
  findShopByShopId,
} = require('../../utils/paymentResponseHelper');
const { addDays } = require('../../utils/trialHelper');
const { clearShopUserTokens } = require('../../services/trialExpirationService');

const { PAYMENT_STATUS } = Payments;
const REVIEWABLE_STATUS = 'pending';
const ADMIN_SETTABLE_STATUSES = ['approve', 'rejected'];

const { SUBSCRIPTION_TYPES } = ShopsData;
const MULTI_MONTH_SUBSCRIPTION_TYPES = ['3months', '6months', '1year'];
const ONE_MONTH_SUBSCRIPTION_TYPE = '1month';

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addOneMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return startOfDay(d);
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const listPendingPayments = async (req, res) => {
  try {
    const payments = await Payments.find({ status: REVIEWABLE_STATUS })
      .sort({ submittedDate: -1 })
      .lean();

    const shopIds = [...new Set(payments.map((p) => p.shopId))];
    const shops = await ShopsData.find({ shopId: { $in: shopIds } }).lean();
    const shopById = new Map(shops.map((s) => [s.shopId, s]));

    res.status(200).json({
      success: true,
      count: payments.length,
      payments: payments.map((payment) => {
        const shop = shopById.get(payment.shopId);
        const formatted = formatPaymentRecord(payment, req);
        return {
          _id: formatted._id,
          shopId: formatted.shopId,
          receiptNumber: formatted.receiptNumber,
          receiptImagePath: formatted.receiptImagePath,
          receiptImageUrl: formatted.receiptImageUrl,
          submittedDate: formatted.submittedDate,
          paymentMonth: formatted.paymentMonth,
          exactPaymentDay: formatted.exactPaymentDay,
          status: formatted.status,
          reason: formatted.reason,
          createdAt: formatted.createdAt,
          updatedAt: formatted.updatedAt,
          shop: shop
            ? {
                shopId: shop.shopId,
                shopName: shop.shopName,
                ownerFirstName: shop.ownerFirstName,
                ownerLastName: shop.ownerLastName,
                shopMobileNumber: shop.shopMobileNumber,
                email: shop.email,
                status: shop.status,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.log('error in listPendingPayments', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment id' });
    }

    const payment = await Payments.findById(paymentId).lean();
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const shop = await findShopByShopId(payment.shopId);

    res.status(200).json({
      success: true,
      payment: formatPaymentRecord(payment, req),
      shop: formatShopSummary(shop),
    });
  } catch (error) {
    console.log('error in getPaymentDetails', error);
    res.status(500).json({ success: false, message: error.message });
  }
};



function validateUpfrontApproveScenario(shop) {
  const subscriptionType = shop.subscriptionType;
  const shopStatus = shop.status;

  if (!subscriptionType || !SUBSCRIPTION_TYPES.includes(subscriptionType)) {
    return {
      error: 'Shop subscription type must be set before approving upfront payment',
    };
  }

  if (MULTI_MONTH_SUBSCRIPTION_TYPES.includes(subscriptionType)) {
    if (shopStatus === 'trial') {
      return { scenario: 'multiMonthTrial' };
    }
    if (shopStatus === 'trialExpired') {
      return { scenario: 'multiMonthTrialExpired' };
    }
    return {
      error: `Upfront payment for ${subscriptionType} subscription can only be approved when shop status is trial or trialExpired`,
      shopStatus,
      subscriptionType,
    };
  }

  if (subscriptionType === ONE_MONTH_SUBSCRIPTION_TYPE) {
    if (shopStatus !== 'trial' && shopStatus !== 'trialExpired') {
      return {
        error: 'Upfront payment for 1-month subscription can only be approved when shop status is trial or trialExpired',
        shopStatus,
        subscriptionType,
      };
    }
    if (!shop.trailStartDate) {
      return {
        error: 'Shop trial start date is required before approving upfront payment for 1-month subscription',
      };
    }
    return { scenario: 'oneMonthTrial' };
  }

  return {
    error: `Unsupported subscription type: ${subscriptionType}`,
    subscriptionType,
  };
}

async function applyShopUpdatesOnUpfrontApprove(shop) {
  const validation = validateUpfrontApproveScenario(shop);
  if (validation.error) {
    const err = new Error(validation.error);
    err.code = 'UPFRONT_APPROVE_SCENARIO';
    throw err;
  }

  shop.isOneTimePaymentDone = true;

  switch (validation.scenario) {
    case 'multiMonthTrial':
      break;
    case 'multiMonthTrialExpired':
      shop.status = 'paymentPending';
      break;
    case 'oneMonthTrial': {
      const trialStart = startOfDay(shop.trailStartDate);
      shop.subscriptionStartDate = trialStart;
      shop.nextPaymentDate = startOfDay(addDays(trialStart, 30));
      shop.status = 'active';
      break;
    }
    default:
      throw new Error('Unhandled upfront approval scenario');
  }

  await shop.save();
}

const rejectUpfrontPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment id' });
    }

    const reasonTrimmed = reason != null ? String(reason).trim() : '';
    if (!reasonTrimmed) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required when rejecting a payment',
      });
    }

    const payment = await Payments.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.paymentType !== 'upFront') {
      return res.status(400).json({
        success: false,
        message: 'Only upfront payments can be rejected with this action',
        paymentType: payment.paymentType,
      });
    }

    if (payment.status !== REVIEWABLE_STATUS) {
      return res.status(400).json({
        success: false,
        message: `Only payments with status "${REVIEWABLE_STATUS}" can be rejected`,
        currentStatus: payment.status,
      });
    }

    const shop = await ShopsData.findOne({ shopId: payment.shopId });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found for this payment' });
    }

    payment.status = 'rejected';
    payment.reason = reasonTrimmed;
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Upfront payment rejected',
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: formatShopSummary(shop.toObject()),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log('error in rejectUpfrontPayment', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const approveUpfrontPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment id' });
    }

    const payment = await Payments.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.paymentType !== 'upFront') {
      return res.status(400).json({
        success: false,
        message: 'Only upfront payments can be approved with this action',
        paymentType: payment.paymentType,
      });
    }

    if (payment.status !== REVIEWABLE_STATUS) {
      return res.status(400).json({
        success: false,
        message: `Only payments with status "${REVIEWABLE_STATUS}" can be approved`,
        currentStatus: payment.status,
      });
    }

    const shop = await ShopsData.findOne({ shopId: payment.shopId });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found for this payment' });
    }

    const scenarioCheck = validateUpfrontApproveScenario(shop);
    if (scenarioCheck.error) {
      return res.status(400).json({
        success: false,
        message: scenarioCheck.error,
        ...(scenarioCheck.shopStatus && { shopStatus: scenarioCheck.shopStatus }),
        ...(scenarioCheck.subscriptionType && { subscriptionType: scenarioCheck.subscriptionType }),
      });
    }

    payment.status = 'approve';
    payment.reason = null;
    if (!payment.exactPaymentDay) {
      payment.exactPaymentDay = startOfDay(payment.submittedDate || new Date());
    }

    await applyShopUpdatesOnUpfrontApprove(shop);
    await payment.save();

    const usersLoggedOut = await clearShopUserTokens(shop.shopId);

    res.status(200).json({
      success: true,
      message: 'Upfront payment approved and shop subscription updated',
      usersLoggedOut,
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: formatShopSummary(shop.toObject()),
    });
  } catch (error) {
    if (error.code === 'UPFRONT_APPROVE_SCENARIO') {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log('error in approveUpfrontPayment', error);
    res.status(500).json({ success: false, message: error.message });
  }
};



module.exports = {
  listPendingPayments,
  getPaymentDetails,
  approveUpfrontPayment,
  rejectUpfrontPayment,
};
