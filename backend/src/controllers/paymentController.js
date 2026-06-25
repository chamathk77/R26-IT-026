const mongoose = require('mongoose');
const Payments = require('../models/payments');
const ShopsData = require('../models/shopsData');
const User = require('../models/user');
const {
  publicReceiptPath,
  unlinkReceiptImageIfLocal,
} = require('../middleware/uploadReceiptImage');
const { formatPaymentRecord } = require('../utils/paymentReceiptHelper');
const { sendSms } = require('../services/smsService');

const { PAYMENT_MONTH_CODES } = Payments;

/** One letter per month for receipt numbers (e.g. J26000001 = June 2026, seq 000001). */
const MONTH_RECEIPT_LETTER = {
  january: 'A',
  february: 'F',
  march: 'M',
  april: 'P',
  may: 'Y',
  june: 'J',
  july: 'L',
  august: 'G',
  september: 'S',
  october: 'O',
  november: 'N',
  december: 'D',
};

function normalizeShopId(shopId) {
  return String(shopId).trim().toUpperCase();
}

function isValidShopIdFormat(shopId) {
  return /^SI\d{6}$/.test(shopId);
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getPaymentMonthFromDate(date) {
  return PAYMENT_MONTH_CODES[new Date(date).getMonth()];
}

/** Resolve payment record dates from shop (shop subscription fields updated on approve only). */
function isFirstPayment(shop) {
  if (shop.subscriptionStartDate) {
    return false;
  }
  // After trial ends: no subscription yet → first payment (today)
  if (shop.status === 'trialExpired') {
    return true;
  }
  // No billing cycle scheduled yet
  return !shop.nextPaymentDate;
}

function resolvePaymentSchedule(shop) {
  const today = startOfDay();
  const isFirst = isFirstPayment(shop);

  if (isFirst) {
    return {
      isFirstPayment: true,
      paymentMonth: getPaymentMonthFromDate(today),
      submittedDate: today,
      exactPaymentDay: today,
    };
  }

  if (!shop.nextPaymentDate) {
    return {
      error: 'Next payment date is not set for this shop. Please contact support.',
    };
  }

  const billingDate = startOfDay(shop.nextPaymentDate);

  return {
    isFirstPayment: false,
    paymentMonth: getPaymentMonthFromDate(billingDate),
    submittedDate: new Date(),
    exactPaymentDay: billingDate,
  };
}

async function generateReceiptNumber(paymentMonth, referenceDate = new Date()) {
  const monthLetter = MONTH_RECEIPT_LETTER[paymentMonth];
  if (!monthLetter) {
    throw new Error(`Invalid payment month for receipt number: ${paymentMonth}`);
  }

  const yearSuffix = String(referenceDate.getFullYear()).slice(-2);
  const prefix = `${monthLetter}${yearSuffix}`;
  const receiptPattern = new RegExp(`^${prefix}\\d{6}$`);

  const latest = await Payments.findOne({ receiptNumber: receiptPattern })
    .sort({ receiptNumber: -1 })
    .lean();

  let sequence = 1;
  if (latest?.receiptNumber) {
    sequence = Number.parseInt(latest.receiptNumber.slice(3), 10) + 1;
  }

  if (sequence > 999999) {
    throw new Error('Receipt number sequence limit reached for this month');
  }

  return `${prefix}${String(sequence).padStart(6, '0')}`;
}

function formatPayment(payment) {
  return formatPaymentRecord(payment);
}

async function verifyShopAccess(req, shopId) {
  const user = await User.findById(req.user.id).select('shopId role').lean();
  if (!user) {
    return {
      error: { status: 401, body: { success: false, message: 'User not found' } },
    };
  }

  if (user.shopId && normalizeShopId(user.shopId) !== shopId) {
    return {
      error: {
        status: 403,
        body: {
          success: false,
          message: 'You can only access payments for your own shop',
        },
      },
    };
  }

  const shop = await ShopsData.findOne({ shopId }).lean();
  if (!shop) {
    return {
      error: { status: 404, body: { success: false, message: 'Shop not found' } },
    };
  }

  return { user, shop };
}


// get payments by shop
const getPaymentsByShop = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId || req.query.shopId || req.user?.shopId || '');

    if (!shopId) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }

    if (!isValidShopIdFormat(shopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }

    const access = await verifyShopAccess(req, shopId);
    if (access.error) {
      return res.status(access.error.status).json(access.error.body);
    }

    const filter = { shopId };
    if (req.query.status) {
      const status = String(req.query.status).trim();
      if (!Payments.PAYMENT_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${Payments.PAYMENT_STATUS.join(', ')}`,
        });
      }
      filter.status = status;
    }

    const payments = await Payments.find(filter).sort({ submittedDate: -1 }).lean();

    res.status(200).json({
      success: true,
      shopId,
      count: payments.length,
      payments: payments.map(formatPayment),
    });
  } catch (error) {
    console.log('error in getPaymentsByShop', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
//
// get recent payment by shop
const getRecentPaymentByShop = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params.shopId || req.query.shopId || req.user?.shopId || '');

    if (!shopId) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }

    if (!isValidShopIdFormat(shopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }

    const access = await verifyShopAccess(req, shopId);
    if (access.error) {
      return res.status(access.error.status).json(access.error.body);
    }

    const filter = { shopId };
    if (req.query.status) {
      const status = String(req.query.status).trim();
      if (!Payments.PAYMENT_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${Payments.PAYMENT_STATUS.join(', ')}`,
        });
      }
      filter.status = status;
    }

    const payment = await Payments.findOne(filter).sort({ submittedDate: -1 }).lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No payment found for this shop',
        shopId,
      });
    }

    res.status(200).json({
      success: true,
      shopId,
      payment: formatPayment(payment),
    });
  } catch (error) {
    console.log('error in getRecentPaymentByShop', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const SUBMITTABLE_PAYMENT_STATUSES = ['notPaid', 'rejected'];

const OUTSTANDING_UPFRONT_STATUSES = ['pending', 'rejected', 'notPaid'];

const INTERNAL_PAYMENT_NOTIFY_ROLES = ['internalAdmin', 'internalStaff'];

function formatSubmittedPaymentTypeLabel(paymentType) {
  return paymentType === 'upFront' ? 'up-front payment' : 'subscription payment';
}

function buildPaymentSubmittedAdminSms({ shopId, paymentType, receiptNumber }) {
  const typeLabel = formatSubmittedPaymentTypeLabel(paymentType);
  return `Smart Cost alert: Shop ${shopId} submitted a new ${typeLabel} (Receipt: ${receiptNumber}). Please review in the admin portal.`;
}

async function notifyInternalStaffPaymentSubmitted(payment) {
  const internalUsers = await User.find({
    role: { $in: INTERNAL_PAYMENT_NOTIFY_ROLES },
  })
    .select('phone role name')
    .lean();

  if (!internalUsers.length) {
    return { sent: 0, failed: 0, skipped: 0, reason: 'No internal admin or staff users found' };
  }

  const message = buildPaymentSubmittedAdminSms({
    shopId: normalizeShopId(payment.shopId),
    paymentType: payment.paymentType,
    receiptNumber: payment.receiptNumber,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of internalUsers) {
    const phone = user.phone?.trim();
    if (!phone) {
      skipped += 1;
      console.log(
        'payment submitted admin SMS skipped - no phone',
        user.role,
        user.name || user._id,
      );
      continue;
    }

    try {
      await sendSms({ to: phone, message });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.log(
        'payment submitted admin SMS failed',
        user.role,
        phone,
        error.message,
      );
    }
  }

  return { sent, failed, skipped, total: internalUsers.length };
}

/** Submit receipt image for a payment (notPaid or rejected → pending). */
const paymentSubmit = async (req, res) => {
  let savedReceiptPath = null;

  try {
    const paymentId = String(req.params.paymentId || req.body.paymentId || '').trim();

    if (!paymentId) {
      if (req.file) {
        unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      }
      return res.status(400).json({ success: false, message: 'Payment id is required' });
    }

    if (!isValidObjectId(paymentId)) {
      if (req.file) {
        unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      }
      return res.status(400).json({ success: false, message: 'Invalid payment id' });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Receipt image is required (form field: receipt)',
      });
    }

    const payment = await Payments.findById(paymentId);
    if (!payment) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (!SUBMITTABLE_PAYMENT_STATUSES.includes(payment.status)) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(400).json({
        success: false,
        message: 'Only not paid or rejected payments can be submitted',
        currentStatus: payment.status,
      });
    }

    const shopId = normalizeShopId(payment.shopId);
    const access = await verifyShopAccess(req, shopId);
    if (access.error) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(access.error.status).json(access.error.body);
    }

    const user = await User.findById(req.user.id).select('shopId role').lean();
    if (!user) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (user.shopId && normalizeShopId(user.shopId) !== shopId) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(403).json({
        success: false,
        message: 'You can only submit payment for your own shop',
      });
    }

    if (payment.paymentType === 'subscription') {
      const shop = access.shop;
      const outstandingUpFront = await Payments.findOne({
        shopId,
        paymentType: 'upFront',
        status: { $in: OUTSTANDING_UPFRONT_STATUSES },
      })
        .sort({ submittedDate: -1 })
        .lean();

      if (!shop.isOneTimePaymentDone || outstandingUpFront) {
        unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));

        let message =
          'Please submit your one-time upfront payment before submitting a subscription payment';
        if (outstandingUpFront?.status === 'pending') {
          message =
            'Your upfront payment is awaiting approval. Please wait for approval before submitting a subscription payment';
        } else if (outstandingUpFront?.status === 'rejected') {
          message =
            'Your upfront payment was rejected. Please resubmit your upfront payment before submitting a subscription payment';
        } else if (outstandingUpFront?.status === 'notPaid') {
          message =
            'Please submit your one-time upfront payment receipt before submitting a subscription payment';
        }

        return res.status(400).json({
          success: false,
          message,
          isOneTimePaymentDone: shop.isOneTimePaymentDone,
          ...(outstandingUpFront && {
            upFrontPaymentId: outstandingUpFront._id,
            upFrontPaymentStatus: outstandingUpFront.status,
          }),
        });
      }
    }

    if (payment.paymentMonth) {
      const existingPending = await Payments.findOne({
        shopId,
        paymentMonth: payment.paymentMonth,
        status: 'pending',
        _id: { $ne: payment._id },
      }).lean();

      if (existingPending) {
        unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
        return res.status(400).json({
          success: false,
          message: `A pending payment already exists for ${payment.paymentMonth}`,
          paymentId: existingPending._id,
        });
      }
    }

    const previousReceiptPath = payment.receiptImagePath;
    savedReceiptPath = publicReceiptPath(req.file.filename);

    payment.receiptImagePath = savedReceiptPath;
    payment.submittedDate = new Date();
    payment.status = 'pending';
    payment.reason = null;
    await payment.save();

    if (
      previousReceiptPath &&
      previousReceiptPath !== 'pending-upload' &&
      previousReceiptPath !== savedReceiptPath
    ) {
      unlinkReceiptImageIfLocal(previousReceiptPath);
    }

    const notifyResult = await notifyInternalStaffPaymentSubmitted(payment);
    if (notifyResult.sent === 0) {
      console.log('payment submitted admin SMS not sent', notifyResult.reason || notifyResult);
    }

    res.status(200).json({
      success: true,
      message: 'Payment submitted successfully',
      payment: formatPayment(payment),
      shop: { shopId: access.shop.shopId, status: access.shop.status },
    });
  } catch (error) {
    if (savedReceiptPath) {
      unlinkReceiptImageIfLocal(savedReceiptPath);
    } else if (req.file) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
    }
    console.log('error in paymentSubmit', error);
    res.status(500).json({ success: false, message: error.message });
  }
};



module.exports = {
  paymentSubmit,
  getPaymentsByShop,
  getRecentPaymentByShop,
};
