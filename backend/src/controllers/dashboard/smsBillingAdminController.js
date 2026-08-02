const mongoose = require('mongoose');
const Payments = require('../../models/payments');
const ShopsData = require('../../models/shopsData');
const {
  formatPaymentRecord,
  formatShopSummary,
  findShopByShopId,
} = require('../../utils/paymentResponseHelper');
const { addDays } = require('../../utils/trialHelper');
const { sendSms } = require('../../services/smsService');

const { PAYMENT_STATUS } = Payments;

const SMS_PAYMENT_TYPE = 'sms';
const DEFAULT_SMS_PACKAGE_TYPE = '0-500';
const SMS_RENEWAL_PERIOD_DAYS = 30;
const REVIEWABLE_STATUS = 'pending';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
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

function mapSmsShopResponse(shop) {
  if (!shop) return null;
  const summary = formatShopSummary(
    typeof shop.toObject === 'function' ? shop.toObject() : shop,
  );
  const smsFeature = summary?.smsfeature ?? shop.smsfeature ?? {};

  return {
    ...summary,
    smsFeatureStatus: smsFeature.smsFeatureStatus ?? null,
    smsDueDays: smsFeature.smsDueDays ?? 0,
    smsPackageType: smsFeature.smsPackageType ?? null,
    smsReceiptNo: smsFeature.smsReceiptNo ?? null,
    isSmsFeatureActive: smsFeature.isSmsFeatureActive ?? false,
    smsNextRenewalDate: smsFeature.smsNextRenewalDate ?? null,
    smsUsedInPeriod: smsFeature.smsUsedInPeriod ?? 0,
    isSmsDeactivationScheduled: smsFeature.isSmsDeactivationScheduled === true,
  };
}

function mapSmsPaymentListItem(payment, shop, req) {
  const formatted = formatPaymentRecord(payment, req);
  const smsFeature = shop?.smsfeature ?? {};

  return {
    _id: formatted._id,
    shopId: formatted.shopId,
    receiptNumber: formatted.receiptNumber,
    receiptImagePath: formatted.receiptImagePath,
    receiptImageUrl: formatted.receiptImageUrl,
    receiptImageAvailable: formatted.receiptImageAvailable,
    paymentType: formatted.paymentType,
    paymentAmount: formatted.paymentAmount,
    subscriptionType: formatted.subscriptionType ?? null,
    submittedDate: formatted.submittedDate,
    paymentMonth: formatted.paymentMonth,
    exactPaymentDay: formatted.exactPaymentDay,
    expiryDate: formatted.expiryDate ?? null,
    status: formatted.status,
    reason: formatted.reason,
    description: formatted.description ?? null,
    createdAt: formatted.createdAt,
    updatedAt: formatted.updatedAt,
    shop: shop
      ? {
          shopId: shop.shopId,
          shopName: shop.shopName,
          ownerFirstName: shop.ownerFirstName,
          ownerLastName: shop.ownerLastName,
          ownerMobileNumber: shop.ownerMobileNumber,
          shopMobileNumber: shop.shopMobileNumber,
          email: shop.email,
          status: shop.status,
          smsFeatureStatus: smsFeature.smsFeatureStatus ?? null,
          smsDueDays: smsFeature.smsDueDays ?? 0,
          smsPackageType: smsFeature.smsPackageType ?? null,
          smsReceiptNo: smsFeature.smsReceiptNo ?? null,
          isSmsFeatureActive: smsFeature.isSmsFeatureActive ?? false,
        }
      : null,
  };
}

async function loadSmsPaymentForAction(paymentId) {
  if (!isValidObjectId(paymentId)) {
    return { error: { status: 400, body: { success: false, message: 'Invalid payment id' } } };
  }

  const payment = await Payments.findById(paymentId);
  if (!payment) {
    return { error: { status: 404, body: { success: false, message: 'Payment not found' } } };
  }

  if (payment.paymentType !== SMS_PAYMENT_TYPE) {
    return {
      error: {
        status: 400,
        body: {
          success: false,
          message: 'Only SMS payments can be processed with this action',
          paymentType: payment.paymentType,
        },
      },
    };
  }

  if (payment.status !== REVIEWABLE_STATUS) {
    return {
      error: {
        status: 400,
        body: {
          success: false,
          message: `Only payments with status "${REVIEWABLE_STATUS}" can be processed`,
          currentStatus: payment.status,
        },
      },
    };
  }

  const shop = await ShopsData.findOne({ shopId: payment.shopId });
  if (!shop) {
    return {
      error: {
        status: 404,
        body: { success: false, message: 'Shop not found for this payment' },
      },
    };
  }

  return { payment, shop };
}

function applySmsFeatureActivation(shop, { renewalBaseDate }) {
  if (!shop.smsfeature) {
    shop.smsfeature = {};
  }

  const baseDate = startOfDay(renewalBaseDate || new Date());

  shop.smsfeature.smsFeatureStatus = 'active';
  shop.smsfeature.smsNextRenewalDate = startOfDay(addDays(baseDate, SMS_RENEWAL_PERIOD_DAYS));
  shop.smsfeature.smsReceiptNo = null;
  shop.smsfeature.smsDueDays = 0;
  shop.smsfeature.isSmsFeatureActive = true;
  shop.smsfeature.smsUsedInPeriod = 0;
  shop.smsfeature.smsPackageType = DEFAULT_SMS_PACKAGE_TYPE;
  shop.smsfeature.isSmsDeactivationScheduled = false;
}

/**
 * Apply queued SMS deactivation after the month bill is approved.
 */
function applySmsFeatureScheduledDeactivation(shop) {
  if (!shop.smsfeature) {
    shop.smsfeature = {};
  }

  shop.smsfeature.isSmsFeatureActive = false;
  shop.smsfeature.smsFeatureStatus = 'inactive';
  shop.smsfeature.smsNextRenewalDate = null;
  shop.smsfeature.smsDueDays = 0;
  shop.smsfeature.smsReceiptNo = null;
  shop.smsfeature.smsUsedInPeriod = null;
  shop.smsfeature.smsPackageType = null;
  shop.smsfeature.isSmsDeactivationScheduled = false;
}

/**
 * After bill approval: honor scheduled deactivation, otherwise renew/activate SMS.
 */
function applySmsFeatureAfterBillApproval(shop, { renewalBaseDate }) {
  const deactivationScheduled = shop.smsfeature?.isSmsDeactivationScheduled === true;

  if (deactivationScheduled) {
    applySmsFeatureScheduledDeactivation(shop);
    return { deactivated: true };
  }

  applySmsFeatureActivation(shop, { renewalBaseDate });
  return { deactivated: false };
}

function getShopCustomerMobile(shop) {
  return shop.ownerMobileNumber?.trim() || shop.shopMobileNumber?.trim() || '';
}

function buildSmsBillApprovedMessage({ receiptNumber, paymentAmount, deactivated }) {
  const amountLabel =
    paymentAmount != null ? `Rs. ${Number(paymentAmount).toLocaleString('en-LK')}` : '';
  if (deactivated) {
    return (
      `Smart Cost: Your SMS package payment has been approved` +
      (amountLabel ? ` (${amountLabel})` : '') +
      `. Receipt: ${receiptNumber}. SMS has been deactivated as you requested. Thank you.`
    );
  }
  return (
    `Smart Cost: Your SMS package payment has been approved` +
    (amountLabel ? ` (${amountLabel})` : '') +
    `. Receipt: ${receiptNumber}. SMS feature is now active. Thank you.`
  );
}

function buildSmsBillRejectedMessage({ receiptNumber, reason }) {
  return (
    `Smart Cost: Your SMS package payment (Receipt: ${receiptNumber}) was rejected. ` +
    `Reason: ${reason}. Please resubmit your payment in the app.`
  );
}

async function sendSmsBillApprovedSms(shop, payment, { deactivated = false } = {}) {
  const mobile = getShopCustomerMobile(shop);
  if (!mobile) {
    return { sent: false, reason: 'Shop owner mobile number is not set' };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildSmsBillApprovedMessage({
        receiptNumber: payment.receiptNumber,
        paymentAmount: payment.paymentAmount,
        deactivated,
      }),
    });
    return { sent: true };
  } catch (error) {
    console.log('error in sendSmsBillApprovedSms', error.message);
    return { sent: false, reason: error.message || 'SMS send failed' };
  }
}

async function sendSmsBillRejectedSms(shop, payment, reason) {
  const mobile = getShopCustomerMobile(shop);
  if (!mobile) {
    return { sent: false, reason: 'Shop owner mobile number is not set' };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildSmsBillRejectedMessage({
        receiptNumber: payment.receiptNumber,
        reason,
      }),
    });
    return { sent: true };
  } catch (error) {
    console.log('error in sendSmsBillRejectedSms', error.message);
    return { sent: false, reason: error.message || 'SMS send failed' };
  }
}

/**
 * GET /api/dashboard/sms-billing
 * List SMS payment records. Optional query: status, page, limit, shopId
 */
const getSmsPayments = async (req, res) => {
  try {
    const statusFilter = normalizePaymentStatusFilter(req.query.status);
    if (statusFilter.error) {
      return res.status(400).json({
        success: false,
        message: statusFilter.error,
        allowedStatuses: PAYMENT_STATUS,
      });
    }

    const query = {
      paymentType: SMS_PAYMENT_TYPE,
    };

    if (statusFilter.status) {
      query.status = statusFilter.status;
    }

    const shopId = req.query.shopId ? String(req.query.shopId).trim().toUpperCase() : '';
    if (shopId) {
      query.shopId = shopId;
    }

    const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
    const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payments.find(query)
        .sort({ submittedDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payments.countDocuments(query),
    ]);

    const shopIds = [...new Set(payments.map((p) => p.shopId))];
    const shops = await ShopsData.find({ shopId: { $in: shopIds } })
      .select(
        'shopId shopName ownerFirstName ownerLastName ownerMobileNumber shopMobileNumber email status smsfeature',
      )
      .lean();
    const shopById = new Map(shops.map((s) => [s.shopId, s]));

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
      count: payments.length,
      paymentType: SMS_PAYMENT_TYPE,
      status: statusFilter.status,
      allowedStatuses: PAYMENT_STATUS,
      payments: payments.map((payment) =>
        mapSmsPaymentListItem(payment, shopById.get(payment.shopId), req),
      ),
    });
  } catch (error) {
    console.log('error in getSmsPayments', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/dashboard/sms-billing/:paymentId
 * Get a single SMS payment record by id
 */
const getSmsPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment id' });
    }

    const payment = await Payments.findById(paymentId).lean();
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.paymentType !== SMS_PAYMENT_TYPE) {
      return res.status(400).json({
        success: false,
        message: 'Payment is not an SMS billing record',
        paymentType: payment.paymentType,
      });
    }

    const shop = await findShopByShopId(payment.shopId);

    return res.status(200).json({
      success: true,
      payment: formatPaymentRecord(payment, req),
      shop: mapSmsShopResponse(shop),
    });
  } catch (error) {
    console.log('error in getSmsPaymentDetails', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/sms-billing/:paymentId/approve
 * Approve SMS bill: payment → approve, renew from existing smsNextRenewalDate + 30 days
 */
const approveSmsBill = async (req, res) => {
  try {
    const loaded = await loadSmsPaymentForAction(req.params.paymentId);
    if (loaded.error) {
      return res.status(loaded.error.status).json(loaded.error.body);
    }

    const { payment, shop } = loaded;
    const currentRenewal = shop.smsfeature?.smsNextRenewalDate
      ? startOfDay(shop.smsfeature.smsNextRenewalDate)
      : startOfDay();

    const { deactivated } = applySmsFeatureAfterBillApproval(shop, {
      renewalBaseDate: currentRenewal,
    });

    payment.status = 'approve';
    payment.reason = null;
    if (!payment.exactPaymentDay) {
      payment.exactPaymentDay = startOfDay(payment.submittedDate || new Date());
    }

    await shop.save();
    await payment.save();

    const customerSms = await sendSmsBillApprovedSms(shop, payment, { deactivated });
    if (!customerSms.sent) {
      console.log('SMS bill approved SMS not sent', customerSms.reason);
    }

    return res.status(200).json({
      success: true,
      message: deactivated
        ? 'SMS payment approved. Scheduled deactivation has been applied.'
        : 'SMS payment approved successfully',
      deactivated,
      customerSms,
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: mapSmsShopResponse(shop),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log('error in approveSmsBill', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/sms-billing/:paymentId/reject
 * Reject SMS bill: payment → rejected (reason required)
 */
const rejectSmsBill = async (req, res) => {
  try {
    const reasonTrimmed =
      req.body?.reason != null ? String(req.body.reason).trim() : '';
    if (!reasonTrimmed) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required when rejecting a payment',
      });
    }

    const loaded = await loadSmsPaymentForAction(req.params.paymentId);
    if (loaded.error) {
      return res.status(loaded.error.status).json(loaded.error.body);
    }

    const { payment, shop } = loaded;

    payment.status = 'rejected';
    payment.reason = reasonTrimmed;
    await payment.save();

    const customerSms = await sendSmsBillRejectedSms(shop, payment, reasonTrimmed);
    if (!customerSms.sent) {
      console.log('SMS bill rejected SMS not sent', customerSms.reason);
    }

    return res.status(200).json({
      success: true,
      message: 'SMS payment rejected successfully',
      customerSms,
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: mapSmsShopResponse(shop),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log('error in rejectSmsBill', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/sms-billing/:paymentId/reset-and-approve
 * Approve SMS bill and reset renewal from today + 30 days
 */
const resetAndApproveSmsBill = async (req, res) => {
  try {
    const loaded = await loadSmsPaymentForAction(req.params.paymentId);
    if (loaded.error) {
      return res.status(loaded.error.status).json(loaded.error.body);
    }

    const { payment, shop } = loaded;

    const { deactivated } = applySmsFeatureAfterBillApproval(shop, {
      renewalBaseDate: startOfDay(),
    });

    payment.status = 'approve';
    payment.reason = null;
    if (!payment.exactPaymentDay) {
      payment.exactPaymentDay = startOfDay(payment.submittedDate || new Date());
    }

    await shop.save();
    await payment.save();

    const customerSms = await sendSmsBillApprovedSms(shop, payment, { deactivated });
    if (!customerSms.sent) {
      console.log('SMS bill reset-and-approve SMS not sent', customerSms.reason);
    }

    return res.status(200).json({
      success: true,
      message: deactivated
        ? 'SMS payment reset and approved. Scheduled deactivation has been applied.'
        : 'SMS payment reset and approved successfully',
      deactivated,
      customerSms,
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: mapSmsShopResponse(shop),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log('error in resetAndApproveSmsBill', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSmsPayments,
  getSmsPaymentDetails,
  approveSmsBill,
  rejectSmsBill,
  resetAndApproveSmsBill,
};
