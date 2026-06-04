const ShopsData = require('../models/shopsData');

function buildPublicFileUrl(req, storedPath) {
  if (!storedPath || typeof storedPath !== 'string') {
    return null;
  }
  if (/^https?:\/\//i.test(storedPath)) {
    return storedPath;
  }
  const pathPart = storedPath.startsWith('/') ? storedPath : `/${storedPath}`;
  return `${req.protocol}://${req.get('host')}${pathPart}`;
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
  return {
    ...record,
    receiptImageUrl: buildPublicFileUrl(req, record.receiptImagePath),
  };
}

async function findShopByShopId(shopId) {
  return ShopsData.findOne({ shopId: String(shopId).trim().toUpperCase() }).lean();
}

module.exports = {
  buildPublicFileUrl,
  formatShopSummary,
  formatPaymentRecord,
  findShopByShopId,
};
