const ShopsData = require('../models/shopsData');
const { isLocalUploadAvailable } = require('./uploadPathHelper');

function getPublicBaseUrl(req) {
  const configured = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (configured) {
    return configured;
  }

  if (!req) {
    return '';
  }

  return `${req.protocol}://${req.get('host')}`;
}

function buildPublicFileUrl(req, storedPath) {
  if (!storedPath || typeof storedPath !== 'string') {
    return null;
  }
  if (/^https?:\/\//i.test(storedPath)) {
    return storedPath;
  }
  const pathPart = storedPath.startsWith('/') ? storedPath : `/${storedPath}`;
  const base = getPublicBaseUrl(req);
  return `${base}${pathPart}`;
}

function formatShopSummary(shop) {
  if (!shop) return null;

  const data = typeof shop.toObject === 'function' ? shop.toObject() : { ...shop };
  delete data.otp;
  delete data.otpExpiresAt;
  delete data.__v;
  return data;
}

function formatPaymentRecord(payment, req) {
  const record = typeof payment.toObject === 'function' ? payment.toObject() : { ...payment };
  const receiptImagePath = record.receiptImagePath;
  const hasReceiptPath =
    typeof receiptImagePath === 'string' &&
    receiptImagePath.trim() !== '' &&
    receiptImagePath !== 'pending-upload' &&
    !receiptImagePath.includes('pending-upload');

  return {
    ...record,
    receiptImageUrl: buildPublicFileUrl(req, receiptImagePath),
    receiptImageAvailable: hasReceiptPath ? isLocalUploadAvailable(receiptImagePath) : false,
  };
}

async function findShopByShopId(shopId) {
  return ShopsData.findOne({ shopId: String(shopId).trim().toUpperCase() }).lean();
}

module.exports = {
  getPublicBaseUrl,
  buildPublicFileUrl,
  formatShopSummary,
  formatPaymentRecord,
  findShopByShopId,
};
