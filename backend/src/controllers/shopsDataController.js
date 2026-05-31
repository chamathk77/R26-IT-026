const ShopsData = require('../models/shopsData');

const SHOP_FEATURE_KEYS = [
  'manageInventory',
  'sms',
  'kpi',
  'analyticsModule',
  'smsMobileNumber',
  'customerManualOrder',
  'costModule',
];

function normalizeShopId(shopId) {
  return String(shopId).trim().toUpperCase();
}

function isValidShopIdFormat(shopId) {
  return /^SI\d{6}$/.test(shopId);
}

function parseFeatureBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return null;
}

const createShopOnboarding = async (req, res) => {
  try {
    const {
      shopName,
      address,
      shopMobileNumber,
      ownerFirstName,
      ownerLastName,
      ownerMobileNumber,
    } = req.body;

    if (!shopName?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop name is required' });
    }
    if (!address?.trim()) {
      return res.status(400).json({ success: false, message: 'Address is required' });
    }
    if (!shopMobileNumber?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop mobile number is required' });
    }
    if (!ownerFirstName?.trim()) {
      return res.status(400).json({ success: false, message: 'Owner first name is required' });
    }
    if (!ownerLastName?.trim()) {
      return res.status(400).json({ success: false, message: 'Owner last name is required' });
    }
    if (!ownerMobileNumber?.trim()) {
      return res.status(400).json({ success: false, message: 'Owner mobile number is required'  });
    }

    const shopMobileTrimmed = String(shopMobileNumber).trim();
    const ownerMobileTrimmed = String(ownerMobileNumber).trim();

    const existingShopMobile = await ShopsData.findOne({ shopMobileNumber: shopMobileTrimmed }).lean();
    if (existingShopMobile) {
      return res.status(400).json({
        success: false,
        message: 'Shop mobile number is already registered to another shop',
      });
    }

    const existingOwnerMobile = await ShopsData.findOne({ ownerMobileNumber: ownerMobileTrimmed }).lean();
    if (existingOwnerMobile) {
      return res.status(400).json({
        success: false,
        message: 'Owner mobile number is already registered to another shop',
      });
    }

    const shop = await ShopsData.create({
      shopName: String(shopName).trim(),
      address: String(address).trim(),
      shopMobileNumber: shopMobileTrimmed,
      ownerFirstName: String(ownerFirstName).trim(),
      ownerLastName: String(ownerLastName).trim(),
      ownerMobileNumber: ownerMobileTrimmed,
      isFirstTime: true,
    });

    res.status(201).json({
      success: true,
      shopId: shop.shopId,
      message: 'Shop onboarding saved',
    });
  } catch (error) {
    console.log('error in createShopOnboarding', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      console.log('field in createShopOnboarding', field);
      if (field === 'shopMobileNumber') {
        return res.status(400).json({
          success: false,
          message: 'Shop mobile number is already registered to another shop',
        });
      }
      if (field === 'ownerMobileNumber') {
        return res.status(400).json({
          success: false,
          message: 'Owner mobile number is already registered to another shop',
        });
      }
      return res.status(400).json({ success: false, message: 'Shop id conflict, please try again' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShopFeatures = async (req, res) => {
  try {
    const { shopId } = req.body;

    if (!shopId?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }

    const normalizedShopId = normalizeShopId(shopId);

    if (!isValidShopIdFormat(normalizedShopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }

    const shop = await ShopsData.findOne({ shopId: normalizedShopId });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const updates = {};
    for (const key of SHOP_FEATURE_KEYS) {
      if (!(key in req.body)) {
        return res.status(400).json({
          success: false,
          message: `Feature field "${key}" is required`,
        });
      }

      const parsed = parseFeatureBoolean(req.body[key]);
      if (parsed === null) {
        return res.status(400).json({
          success: false,
          message: `Feature "${key}" must be a boolean`,
        });
      }
      updates[key] = parsed;
    }

    const updated = await ShopsData.findOneAndUpdate(
      { shopId: normalizedShopId },
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    res.status(200).json({
      success: true,
      shopId: updated.shopId,
      message: 'Shop features saved',
      features: {
        manageInventory: updated.manageInventory,
        sms: updated.sms,
        kpi: updated.kpi,
        analyticsModule: updated.analyticsModule,
        smsMobileNumber: updated.smsMobileNumber,
        customerManualOrder: updated.customerManualOrder,
        costModule: updated.costModule,
      },
    });
  } catch (error) {
    console.log('error in updateShopFeatures', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createShopOnboarding,
  updateShopFeatures,
  SHOP_FEATURE_KEYS,
};