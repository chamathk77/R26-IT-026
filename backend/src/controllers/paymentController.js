const Payments = require('../models/payments');
const ShopsData = require('../models/shopsData');
const User = require('../models/user');
const {
  publicReceiptPath,
  unlinkReceiptImageIfLocal,
} = require('../middleware/uploadReceiptImage');

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

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getPaymentMonthFromDate(date) {
  return PAYMENT_MONTH_CODES[new Date(date).getMonth()];
}

/** Resolve payment record dates from shop (shop subscription fields updated on approve only). */
function resolvePaymentSchedule(shop) {
  const today = startOfDay();
  const isFirstPayment = !shop.subscriptionStartDate;

  if (isFirstPayment) {
    return {
      isFirstPayment: true,
      paymentMonth: getPaymentMonthFromDate(today),
      submittedDate: today,
      currentPaymentDoneDate: today,
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
    currentPaymentDoneDate: billingDate,
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
  return {
    _id: payment._id,
    shopId: payment.shopId,
    receiptNumber: payment.receiptNumber,
    receiptImagePath: payment.receiptImagePath,
    submittedDate: payment.submittedDate,
    paymentMonth: payment.paymentMonth,
    currentPaymentDoneDate: payment.currentPaymentDoneDate,
    status: payment.status,
    reason: payment.reason,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
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

const getPaymentByReceiptNumber = async (req, res) => {
  try {
    const receiptNumber = String(req.params.receiptNumber || '').trim().toUpperCase();

    if (!receiptNumber) {
      return res.status(400).json({ success: false, message: 'Receipt number is required' });
    }

    const payment = await Payments.findOne({ receiptNumber }).lean();
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const access = await verifyShopAccess(req, payment.shopId);
    if (access.error) {
      return res.status(access.error.status).json(access.error.body);
    }

    res.status(200).json({
      success: true,
      payment: formatPayment(payment),
    });
  } catch (error) {
    console.log('error in getPaymentByReceiptNumber', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const submitPayment = async (req, res) => {
  let savedReceiptPath = null;

  try {
    const { shopId: bodyShopId } = req.body;
    // check if shop id is provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Receipt image is required (form field: receipt)',
      });
    }
    // check if shop id is provided in the body
    const shopId = normalizeShopId(bodyShopId || req.user?.shopId || '');
    if (!shopId) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }
    // check if shop id is valid
    if (!isValidShopIdFormat(shopId)) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }
    // check if shop exists
    const shop = await ShopsData.findOne({ shopId });
    if (!shop) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }
    // resolve payment schedule
    const schedule = resolvePaymentSchedule(shop);
    // check if there is an error in the payment schedule
    if (schedule.error) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(400).json({ success: false, message: schedule.error });
    }
    //

    const { paymentMonth, submittedDate, currentPaymentDoneDate, isFirstPayment } = schedule;

    const user = await User.findById(req.user.id).select('shopId role').lean();
    // check if user exists
    if (!user) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(401).json({ success: false, message: 'User not found' });
    }
  // check if user's shop id is the same as the shop id
    if (user.shopId && normalizeShopId(user.shopId) !== shopId) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(403).json({
        success: false,
        message: 'You can only submit payment for your own shop',
      });
    }
    // check if there is a pending payment for the same month
    const existingPending = await Payments.findOne({
      shopId,
      paymentMonth,
      status: 'pending',
    }).lean();
    // check if there is a pending payment for the same month
    if (existingPending) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
      return res.status(400).json({
        success: false,
        message: `A pending payment already exists for ${paymentMonth}`,
        paymentId: existingPending._id,
      });
    }
    // save the receipt path
    savedReceiptPath = publicReceiptPath(req.file.filename);
    // generate the receipt number
    const receiptNumber = await generateReceiptNumber(
      paymentMonth,
      currentPaymentDoneDate,
    );
    // create the payment
    const payment = await Payments.create({
      shopId,
      receiptNumber,
      receiptImagePath: savedReceiptPath,
      submittedDate,
      paymentMonth,
      status: 'pending',
      currentPaymentDoneDate,
      reason: null,
    });
    shop.status = 'initialPaymentPending';
    await shop.save();

    res.status(201).json({
      success: true,
      message: 'Payment submitted successfully',
      isFirstPayment,
      payment: formatPayment(payment),
      shop: {
        shopId: shop.shopId,
        status: shop.status,
      },
    });
  } catch (error) {
    if (savedReceiptPath) {
      unlinkReceiptImageIfLocal(savedReceiptPath);
    } else if (req.file) {
      unlinkReceiptImageIfLocal(publicReceiptPath(req.file.filename));
    }
    console.log('error in submitPayment', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  submitPayment,
  getPaymentsByShop,
  getRecentPaymentByShop,
  getPaymentByReceiptNumber,
};
