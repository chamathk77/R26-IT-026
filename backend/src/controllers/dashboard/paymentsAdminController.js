const mongoose = require('mongoose');
const Payments = require('../../models/payments');
const ShopsData = require('../../models/shopsData');
const {
  formatPaymentRecord,
  formatShopSummary,
  findShopByShopId,
} = require('../../utils/paymentResponseHelper');

const { PAYMENT_STATUS } = Payments;
const REVIEWABLE_STATUS = 'pending';
const ADMIN_SETTABLE_STATUSES = ['approve', 'rejected'];

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

async function applyShopUpdatesOnApprove(shop, payment) {
  const doneDate = startOfDay(
    payment.exactPaymentDay || payment.submittedDate || new Date(),
  );

  if (!shop.subscriptionStartDate) {
    shop.subscriptionStartDate = doneDate;
  }

  shop.currentPaymentDoneDate = doneDate;
  shop.nextPaymentDate = addOneMonth(doneDate);
  shop.status = 'active';
  await shop.save();
}

async function applyShopUpdatesOnReject(shop) {
  if (shop.status === 'initialPaymentPending') {
    shop.status = 'paymentPending';
    await shop.save();
  }
}

const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, reason } = req.body;
    // check if payment id is valid
    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment id' });
    }
    // check if status is valid
    const statusNormalized = status != null ? String(status).trim() : '';
    if (!ADMIN_SETTABLE_STATUSES.includes(statusNormalized)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${ADMIN_SETTABLE_STATUSES.join(', ')}`,
      });
    }
    // check if payment exists
    const payment = await Payments.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    // check if payment is reviewable
    if (payment.status !== REVIEWABLE_STATUS) {
      return res.status(400).json({
        success: false,
        message: `Only payments with status "${REVIEWABLE_STATUS}" can be updated`,
        currentStatus: payment.status,
      });
    }
    // check if reason is provided when rejecting a payment
    const reasonTrimmed = reason != null ? String(reason).trim() : '';
    if (statusNormalized === 'rejected' && !reasonTrimmed) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required when rejecting a payment',
      });
    }
// check if shop exists
    const shop = await ShopsData.findOne({ shopId: payment.shopId });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found for this payment' });
    }
    // update payment status
    payment.status = statusNormalized;
    payment.reason = statusNormalized === 'rejected' ? reasonTrimmed : null;
    // update shop status
    if (statusNormalized === 'approve') {
      if (!payment.exactPaymentDay) {
        payment.exactPaymentDay = startOfDay(
          payment.submittedDate || new Date(),
        );
      }
      await applyShopUpdatesOnApprove(shop, payment);
    } else {
      await applyShopUpdatesOnReject(shop);
    }

    await payment.save();

    res.status(200).json({
      success: true,
      message:
        statusNormalized === 'approve'
          ? 'Payment approved and shop subscription updated'
          : 'Payment rejected',
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: formatShopSummary(shop.toObject()),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log('error in updatePaymentStatus', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listPendingPayments,
  getPaymentDetails,
  updatePaymentStatus,
};
