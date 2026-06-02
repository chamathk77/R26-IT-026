const User = require('../models/user');
const ShopsData = require('../models/shopsData');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

const ALLOWED_ROLES = ['admin', 'owner', 'staff'];
const OWNER_CREATABLE_ROLES = ['staff', 'admin'];

function normalizeShopId(shopId) {
  return String(shopId).trim().toUpperCase();
}

function isValidShopIdFormat(shopId) {
  return /^SI\d{6}$/.test(shopId);
}

const signupStaff = async (req, res) => {
  try {
    const { shopId, name, email, password, role, phone } = req.body;

    const phoneTrimmed = phone != null ? String(phone).trim() : '';

    if (!shopId?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }
    if (!name?.trim() || !email?.trim() || !password || !role || !phoneTrimmed) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, password, and role are required',
      });
    }

    const normalizedShopId = normalizeShopId(shopId);
    if (!isValidShopIdFormat(normalizedShopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }

    const ownerShopId = req.user?.shopId || '';
    if (!ownerShopId) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not linked to a shop',
      });
    }
    if (normalizedShopId !== ownerShopId) {
      return res.status(403).json({
        success: false,
        message: 'You can only create staff for your own shop',
      });
    }

    const shop = await ShopsData.findOne({ shopId: normalizedShopId }).lean();
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const currentUserCount = await User.countDocuments({ shopId: normalizedShopId });
    const maxUsers = shop.maxUsers ?? 3;

    if (currentUserCount >= maxUsers) {
      return res.status(400).json({
        success: false,
        message: `User creation is full for this shop. Maximum allowed users is ${maxUsers}, please contact the admin.`,
        shopId: normalizedShopId,
        maxUsers,
        currentUsers: currentUserCount,
      });
    }

    const roleNormalized = String(role).toLowerCase().trim();
    if (!OWNER_CREATABLE_ROLES.includes(roleNormalized)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be staff or admin',
      });
    }

    const emailLower = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [{ email: emailLower }, { phone: phoneTrimmed }],
    });
    if (existingUser) {
      const msg =
        existingUser.email === emailLower
          ? 'User already exists with this email'
          : 'User already exists with this phone number';
      return res.status(400).json({ success: false, message: msg });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: emailLower,
      phone: phoneTrimmed,
      password: hashedPassword,
      role: roleNormalized,
      shopId: normalizedShopId,
    });

    res.status(201).json({
      success: true,
      shopId: user.shopId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      message: 'Account created successfully',
      maxUsers,
      currentUsers: currentUserCount + 1,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const message =
        field === 'phone'
          ? 'Phone number already registered'
          : 'User already exists';
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};



const signupOnbading = async (req, res) => {
  try {
    const { shopId, name, email, password, role, phone } = req.body;

    const phoneTrimmed = phone != null ? String(phone).trim() : '';

    if (!shopId?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }
    if (!name?.trim() || !email?.trim() || !password || !role || !phoneTrimmed) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, password, and role are required',
      });
    }

    const normalizedShopId = normalizeShopId(shopId);
    if (!isValidShopIdFormat(normalizedShopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }

    const shop = await ShopsData.findOne({ shopId: normalizedShopId }).lean();
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const roleNormalized = String(role).toLowerCase().trim();
    if (!ALLOWED_ROLES.includes(roleNormalized)) {
      return res.status(400).json({ success: false, message: 'Please select a valid role' });
    }

    const emailLower = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [{ email: emailLower }, { phone: phoneTrimmed }],
    });
    if (existingUser) {
      const msg =
        existingUser.email === emailLower
          ? 'User already exists with this email'
          : 'User already exists with this phone number';
      return res.status(400).json({ success: false, message: msg });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: emailLower,
      phone: phoneTrimmed,
      password: hashedPassword,
      role: roleNormalized,
      shopId: normalizedShopId,
    });

    res.status(201).json({
      success: true,
      shopId: user.shopId,
      message: 'Account created. Please log in.',
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const message =
        field === 'phone'
          ? 'Phone number already registered'
          : 'User already exists';
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const phoneTrimmed = phone != null ? String(phone).trim() : '';

    if (!phoneTrimmed || !password) {
      return res.status(400).json({ success: false, message: 'Mobile number and password are required' });
    }

    const user = await User.findOne({ phone: phoneTrimmed });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number or password',
      });
    }

    res.status(200).json({
      success: true,
      _id: user._id,
      shopId: user.shopId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      message: 'Login successful',
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { signupStaff, signupOnbading, login };
