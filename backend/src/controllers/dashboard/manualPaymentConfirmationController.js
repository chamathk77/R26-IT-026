const mongoose = require('mongoose');
const ManualPaymentConfirmation = require('../../models/manualPaymentConfirmation');
const DashboardUser = require('../../models/dashboardUser');

const MANUAL_RECEIPT_PREFIX = 'M';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeRequiredText(value, fieldName, errors) {
  if (value === undefined || value === null || String(value).trim() === '') {
    errors.push(`${fieldName} is required`);
    return null;
  }
  return String(value).trim();
}

async function generateManualReceiptNumber(referenceDate = new Date()) {
  const yearSuffix = String(referenceDate.getFullYear()).slice(-2);
  const prefix = `${MANUAL_RECEIPT_PREFIX}${yearSuffix}`;
  const receiptPattern = new RegExp(`^${prefix}\\d{6}$`);

  const latest = await ManualPaymentConfirmation.findOne({ receiptNumber: receiptPattern })
    .sort({ receiptNumber: -1 })
    .lean();

  let sequence = 1;
  if (latest?.receiptNumber) {
    sequence = Number.parseInt(latest.receiptNumber.slice(3), 10) + 1;
  }

  if (sequence > 999999) {
    throw new Error('Manual payment receipt number sequence limit reached for this year');
  }

  return `${prefix}${String(sequence).padStart(6, '0')}`;
}

function formatManualPaymentConfirmation(record) {
  const data =
    typeof record.toObject === 'function' ? record.toObject() : { ...record };

  return {
    _id: String(data._id),
    receiptNumber: data.receiptNumber,
    productName: data.productName ?? 'Smart Cost POS',
    shopName: data.shopName,
    address: data.address,
    shopMobileNumber: data.shopMobileNumber,
    paymentAmount: data.paymentAmount,
    paymentMethod: data.paymentMethod ?? 'Manual',
    paymentReceivedDate: data.paymentReceivedDate,
    description: data.description ?? null,
    notes: data.notes ?? null,
    generatedByUserId: data.generatedByUserId ? String(data.generatedByUserId) : null,
    generatedByName: data.generatedByName ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

const createManualPaymentConfirmation = async (req, res) => {
  try {
    const body = req.body ?? {};
    const errors = [];

    const shopName = normalizeRequiredText(body.shopName, 'shopName', errors);
    const productName = normalizeRequiredText(body.productName, 'productName', errors);
    const address = normalizeRequiredText(body.address, 'address', errors);
    const shopMobileNumber = normalizeRequiredText(
      body.shopMobileNumber,
      'shopMobileNumber',
      errors,
    );

    let paymentAmount = null;
    if (
      body.paymentAmount === undefined ||
      body.paymentAmount === null ||
      body.paymentAmount === ''
    ) {
      errors.push('paymentAmount is required');
    } else {
      paymentAmount = Number(body.paymentAmount);
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        errors.push('paymentAmount must be a number greater than 0');
      }
    }

    let paymentReceivedDate = new Date();
    if (body.paymentReceivedDate) {
      const parsed = new Date(body.paymentReceivedDate);
      if (Number.isNaN(parsed.getTime())) {
        errors.push('paymentReceivedDate must be a valid date');
      } else {
        paymentReceivedDate = parsed;
      }
    }

    const description =
      body.description != null && String(body.description).trim() !== ''
        ? String(body.description).trim()
        : 'Manual upfront payment received';

    const notes =
      body.notes != null && String(body.notes).trim() !== ''
        ? String(body.notes).trim()
        : null;

    const paymentMethod =
      body.paymentMethod != null && String(body.paymentMethod).trim() !== ''
        ? String(body.paymentMethod).trim()
        : 'Manual';

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join('; '),
      });
    }

    const receiptNumber = await generateManualReceiptNumber(paymentReceivedDate);

    const dashboardUser = req.user?.id
      ? await DashboardUser.findById(req.user.id).select('name').lean()
      : null;

    const record = await ManualPaymentConfirmation.create({
      receiptNumber,
      productName,
      shopName,
      address,
      shopMobileNumber,
      paymentAmount,
      paymentMethod,
      paymentReceivedDate,
      description,
      notes,
      generatedByUserId: req.user?.id ?? null,
      generatedByName: dashboardUser?.name ?? null,
    });

    res.status(201).json({
      success: true,
      message: 'Manual payment confirmation generated',
      confirmation: formatManualPaymentConfirmation(record),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log('error in createManualPaymentConfirmation', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const listManualPaymentConfirmations = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
    const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      ManualPaymentConfirmation.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ManualPaymentConfirmation.countDocuments({}),
    ]);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      count: records.length,
      confirmations: records.map(formatManualPaymentConfirmation),
    });
  } catch (error) {
    console.log('error in listManualPaymentConfirmations', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getManualPaymentConfirmation = async (req, res) => {
  try {
    const { confirmationId } = req.params;
    if (!isValidObjectId(confirmationId)) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation id' });
    }

    const record = await ManualPaymentConfirmation.findById(confirmationId).lean();
    if (!record) {
      return res.status(404).json({ success: false, message: 'Confirmation not found' });
    }

    res.status(200).json({
      success: true,
      confirmation: formatManualPaymentConfirmation(record),
    });
  } catch (error) {
    console.log('error in getManualPaymentConfirmation', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createManualPaymentConfirmation,
  listManualPaymentConfirmations,
  getManualPaymentConfirmation,
};
