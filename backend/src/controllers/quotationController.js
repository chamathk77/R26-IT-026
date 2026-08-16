const mongoose = require('mongoose');
const Quotation = require('../models/quotation');
const Product = require('../models/product');
const ShopsData = require('../models/shopsData');
const User = require('../models/user');
const { resolveQuotationsModule } = require('../utils/industryHelper');
const {
  calculateBillTotals,
  roundMoney,
  buildBillingSnapshot,
} = require('../services/billingCalculationService');

const { QUOTATION_STATUSES } = Quotation;

function parseBooleanInput(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function getRequestBranchId(req) {
  return String(req.user?.branchId ?? '').trim().toUpperCase();
}

function invalidIdResponse(res) {
  return res.status(400).json({ success: false, message: 'Invalid quotation id' });
}

function mapQuotationRecord(record) {
  if (!record) return null;

  return {
    _id: String(record._id),
    shopId: record.shopId,
    branchId: record.branchId,
    quotationNumber: record.quotationNumber,
    customerName: record.customerName ?? '',
    customerMobile: record.customerMobile ?? '',
    items: Array.isArray(record.items)
      ? record.items.map((item) => ({
          productId: String(item.productId),
          productName: item.productName,
          qty: item.qty,
          unitCost: item.unitCost,
        }))
      : [],
    subtotal: roundMoney(record.subtotal ?? 0),
    isDiscount: Boolean(record.isDiscount),
    discountType: record.discountType === 'percent' ? 'percent' : 'amount',
    discount: roundMoney(record.discount ?? 0),
    discountAmount: roundMoney(record.discountAmount ?? 0),
    includeTaxes: Boolean(record.includeTaxes),
    taxAmount: roundMoney(record.taxAmount ?? 0),
    taxBreakdown: record.taxBreakdown ?? [],
    billingSnapshot: record.billingSnapshot ?? null,
    totalAmount: roundMoney(record.totalAmount ?? 0),
    notes: record.notes ?? '',
    status: record.status ?? 'draft',
    validUntil: record.validUntil ?? null,
    createdBy: record.createdBy ? String(record.createdBy) : null,
    updatedBy: record.updatedBy ? String(record.updatedBy) : null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function getQuotationContext(req) {
  const user = await User.findById(req.user.id).select('role shopId').lean();
  if (!user?.shopId) {
    return { error: { status: 400, message: 'Shop id is required', code: 'SHOP_REQUIRED' } };
  }

  const shopId = String(user.shopId).trim().toUpperCase();
  const branchId = getRequestBranchId(req);
  if (!branchId) {
    return { error: { status: 400, message: 'Branch id is required', code: 'BRANCH_REQUIRED' } };
  }

  const shop = await ShopsData.findOne({ shopId })
    .select('quotationsModule billingConfig automotiveModule')
    .lean();

  if (!shop) {
    return { error: { status: 404, message: 'Shop not found' } };
  }

  if (!resolveQuotationsModule(shop)) {
    return {
      error: {
        status: 403,
        message: 'Quotations module is not enabled for this shop',
        code: 'QUOTATIONS_MODULE_DISABLED',
      },
    };
  }

  return { shopId, branchId, user, shop };
}

async function generateQuotationNumber(shopId) {
  const latest = await Quotation.findOne({ shopId })
    .sort({ quotationNumber: -1 })
    .select('quotationNumber')
    .lean();

  let sequence = 1;
  if (latest?.quotationNumber) {
    const parsed = Number.parseInt(String(latest.quotationNumber).replace(/\D/g, ''), 10);
    if (Number.isFinite(parsed)) {
      sequence = parsed + 1;
    }
  }

  if (sequence > 999999) {
    throw new Error('Quotation number sequence limit reached for this shop');
  }

  return `Q${String(sequence).padStart(6, '0')}`;
}

function calculateSubtotalFromItems(items) {
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const unitCost = Number(item.unitCost) || 0;
    return sum + qty * unitCost;
  }, 0);
  return roundMoney(subtotal);
}

function buildQuotationTotals({ subtotal, includeTaxes, billingConfig, discount }) {
  return calculateBillTotals({
    subtotal,
    discount: discount ?? { enabled: false },
    billingConfig: includeTaxes ? billingConfig : { taxes: [] },
  });
}

function normalizeQuotationDiscount(body) {
  const enabled = parseBooleanInput(body?.isDiscount, false);
  if (!enabled) {
    return { enabled: false, type: 'amount', value: 0 };
  }

  const rawType = String(body?.discountType ?? 'amount').trim().toLowerCase();
  const type = rawType === 'percent' || rawType === 'percentage' ? 'percent' : 'amount';
  const value = Number(body?.discount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Discount value must be greater than 0');
  }

  if (type === 'percent' && value > 100) {
    throw new Error('Percentage discount cannot exceed 100');
  }

  return { enabled: true, type, value };
}

function readQuotationDiscountInput(body, fallbackRecord = null) {
  if (
    Object.prototype.hasOwnProperty.call(body, 'isDiscount') ||
    Object.prototype.hasOwnProperty.call(body, 'discountType') ||
    Object.prototype.hasOwnProperty.call(body, 'discount')
  ) {
    return normalizeQuotationDiscount(body);
  }

  if (!fallbackRecord) {
    return { enabled: false, type: 'amount', value: 0 };
  }

  if (!fallbackRecord.isDiscount) {
    return { enabled: false, type: 'amount', value: 0 };
  }

  return {
    enabled: true,
    type: fallbackRecord.discountType === 'percent' ? 'percent' : 'amount',
    value: Number(fallbackRecord.discount) || 0,
  };
}

async function normalizeQuotationItems(itemsInput, shopId) {
  if (!Array.isArray(itemsInput) || itemsInput.length === 0) {
    throw new Error('At least one line item is required');
  }

  const productIds = [...new Set(itemsInput.map((item) => String(item?.productId ?? '').trim()))].filter(
    Boolean,
  );

  if (productIds.length === 0) {
    throw new Error('Valid product ids are required for quotation items');
  }

  const invalidIds = productIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    throw new Error('One or more product ids are invalid');
  }

  const products = await Product.find({ _id: { $in: productIds }, shopId })
    .select('productName amount type')
    .lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  return itemsInput.map((item, index) => {
    const productId = String(item?.productId ?? '').trim();
    const product = productMap.get(productId);
    if (!product) {
      throw new Error(`Product not found for line item ${index + 1}`);
    }

    const qty = Number(item?.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error(`Quantity must be at least 1 for ${product.productName}`);
    }

    let unitCost;
    if (item?.unitCost !== undefined && item?.unitCost !== null && item?.unitCost !== '') {
      unitCost = Number(item.unitCost);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        throw new Error(`Invalid unit price for ${product.productName}`);
      }
    } else if (product.type === 'service') {
      throw new Error(`Unit price is required for service item ${product.productName}`);
    } else {
      unitCost = Number(product.amount);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        throw new Error(`Product ${product.productName} has no valid selling price`);
      }
    }

    return {
      productId: product._id,
      productName: String(product.productName).trim(),
      qty,
      unitCost: roundMoney(unitCost),
    };
  });
}

function normalizeStatus(value, fallback = 'draft') {
  const normalized = String(value ?? fallback).trim().toLowerCase();
  return QUOTATION_STATUSES.includes(normalized) ? normalized : fallback;
}

function parseValidUntil(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('validUntil must be a valid date');
  }
  return parsed;
}

const createQuotation = async (req, res) => {
  try {
    const context = await getQuotationContext(req);
    if (context.error) {
      return res.status(context.error.status).json({
        success: false,
        message: context.error.message,
        code: context.error.code,
      });
    }

    const { shopId, branchId, user, shop } = context;
    const items = await normalizeQuotationItems(req.body?.items, shopId);
    const includeTaxes = parseBooleanInput(req.body?.includeTaxes, false);
    const discount = normalizeQuotationDiscount(req.body);
    const subtotal = calculateSubtotalFromItems(items);
    const totals = buildQuotationTotals({
      subtotal,
      includeTaxes,
      billingConfig: shop.billingConfig,
      discount,
    });

    const quotationNumber = await generateQuotationNumber(shopId);
    const validUntil = parseValidUntil(req.body?.validUntil);

    const quotation = await Quotation.create({
      shopId,
      branchId,
      quotationNumber,
      customerName: String(req.body?.customerName ?? '').trim(),
      customerMobile: String(req.body?.customerMobile ?? '').trim(),
      items,
      subtotal: totals.subtotal,
      isDiscount: discount.enabled,
      discountType: discount.type,
      discount: discount.enabled ? roundMoney(discount.value) : 0,
      discountAmount: totals.discountAmount,
      includeTaxes,
      taxAmount: totals.taxAmount,
      taxBreakdown: totals.taxBreakdown,
      billingSnapshot: includeTaxes ? totals.billingSnapshot : buildBillingSnapshot({ taxes: [] }),
      totalAmount: totals.totalAmount,
      notes: String(req.body?.notes ?? '').trim(),
      status: normalizeStatus(req.body?.status, 'draft'),
      validUntil,
      createdBy: user._id,
      updatedBy: user._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Quotation created',
      data: mapQuotationRecord(quotation),
    });
  } catch (error) {
    console.log('error in createQuotation', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const listQuotations = async (req, res) => {
  try {
    const context = await getQuotationContext(req);
    if (context.error) {
      return res.status(context.error.status).json({
        success: false,
        message: context.error.message,
        code: context.error.code,
      });
    }

    const { shopId, branchId } = context;
    const records = await Quotation.find({ shopId, branchId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records.map(mapQuotationRecord),
    });
  } catch (error) {
    console.log('error in listQuotations', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getQuotationById = async (req, res) => {
  try {
    const context = await getQuotationContext(req);
    if (context.error) {
      return res.status(context.error.status).json({
        success: false,
        message: context.error.message,
        code: context.error.code,
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const record = await Quotation.findOne({
      _id: id,
      shopId: context.shopId,
      branchId: context.branchId,
    }).lean();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    return res.status(200).json({
      success: true,
      data: mapQuotationRecord(record),
    });
  } catch (error) {
    console.log('error in getQuotationById', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateQuotation = async (req, res) => {
  try {
    const context = await getQuotationContext(req);
    if (context.error) {
      return res.status(context.error.status).json({
        success: false,
        message: context.error.message,
        code: context.error.code,
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const quotation = await Quotation.findOne({
      _id: id,
      shopId: context.shopId,
      branchId: context.branchId,
    });

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'customerName')) {
      quotation.customerName = String(req.body.customerName ?? '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'customerMobile')) {
      quotation.customerMobile = String(req.body.customerMobile ?? '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'notes')) {
      quotation.notes = String(req.body.notes ?? '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      quotation.status = normalizeStatus(req.body.status, quotation.status);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'validUntil')) {
      quotation.validUntil = parseValidUntil(req.body.validUntil);
    }

    const includeTaxes = Object.prototype.hasOwnProperty.call(req.body, 'includeTaxes')
      ? parseBooleanInput(req.body.includeTaxes, quotation.includeTaxes)
      : quotation.includeTaxes;

    const discount = readQuotationDiscountInput(req.body, quotation);

    let items = quotation.items;
    if (Object.prototype.hasOwnProperty.call(req.body, 'items')) {
      items = await normalizeQuotationItems(req.body.items, context.shopId);
      quotation.items = items;
    }

    const subtotal = calculateSubtotalFromItems(items);
    const totals = buildQuotationTotals({
      subtotal,
      includeTaxes,
      billingConfig: context.shop.billingConfig,
      discount,
    });

    quotation.subtotal = totals.subtotal;
    quotation.isDiscount = discount.enabled;
    quotation.discountType = discount.type;
    quotation.discount = discount.enabled ? roundMoney(discount.value) : 0;
    quotation.discountAmount = totals.discountAmount;
    quotation.includeTaxes = includeTaxes;
    quotation.taxAmount = totals.taxAmount;
    quotation.taxBreakdown = totals.taxBreakdown;
    quotation.billingSnapshot = includeTaxes
      ? totals.billingSnapshot
      : buildBillingSnapshot({ taxes: [] });
    quotation.totalAmount = totals.totalAmount;
    quotation.updatedBy = context.user._id;

    await quotation.save();

    return res.status(200).json({
      success: true,
      message: 'Quotation updated',
      data: mapQuotationRecord(quotation),
    });
  } catch (error) {
    console.log('error in updateQuotation', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deleteQuotation = async (req, res) => {
  try {
    const context = await getQuotationContext(req);
    if (context.error) {
      return res.status(context.error.status).json({
        success: false,
        message: context.error.message,
        code: context.error.code,
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const deleted = await Quotation.findOneAndDelete({
      _id: id,
      shopId: context.shopId,
      branchId: context.branchId,
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Quotation deleted',
      data: mapQuotationRecord(deleted),
    });
  } catch (error) {
    console.log('error in deleteQuotation', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createQuotation,
  listQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
};
