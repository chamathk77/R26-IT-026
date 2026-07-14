const User = require('../models/user');
const ShopsData = require('../models/shopsData');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const { createAndSaveLoginToken, createAndSaveTrialToken, clearUserToken } = require('../utils/tokenHelper');
const {
  isActiveTrial,
  isTrialEnded,
} = require('../utils/trialHelper');
const {
  shouldShowTrialPrompt,
  formatUserForLogin,
  formatShopForLogin,
} = require('../utils/trialPromptHelper');
const { sendSms } = require('../services/smsService');

const ALLOWED_ROLES = ['admin', 'owner', 'staff'];
const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300;

function normalizeShopId(shopId) {
  return String(shopId).trim().toUpperCase();
}

function isValidShopIdFormat(shopId) {
  return /^SI\d{6}$/.test(shopId);
}

function generateSixDigitOtp() {
  return Math.floor(100000 + Math.random() * 900000);
}

function normalizeOtpInput(otp) {
  const digits = String(otp).replace(/\D/g, '');
  if (digits.length !== OTP_LENGTH) {
    return null;
  }
  return Number.parseInt(digits, 10);
}

function maskMobileNumber(mobile) {
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length < 4) {
    return digits;
  }
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

const signupOnboarding = async (req, res) => {
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

    await ShopsData.updateOne(
      { shopId: normalizedShopId },
      { $set: { onboardStep: 'passwordSet' } },
    );

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

const sendOtpOnboarding = async (req, res) => {
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

    if (!shop.ownerMobileNumber?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Owner mobile number is not set for this shop',
      });
    }

    const otpCode = generateSixDigitOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

    const message = `Your Smart Cost verification code is ${otpCode}. Valid for ${OTP_EXPIRY_SECONDS / 60} minutes. Do not share this code.`;

    await sendSms({
      to: shop.ownerMobileNumber,
      message,
    });

    shop.otp = otpCode;
    shop.otpExpiresAt = otpExpiresAt;
    await shop.save();

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      shopId: normalizedShopId,
      mobileNumber: maskMobileNumber(shop.ownerMobileNumber),
      otpTimerSeconds: OTP_EXPIRY_SECONDS,
    });
  } catch (error) {
    console.log('error in sendOtp', error.response?.data || error.message);

    const isSmsApiError = error.code === 'SMS_API_ERROR';
    const statusCode = isSmsApiError && error.httpStatus ? error.httpStatus : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to send OTP',
      code: isSmsApiError ? 'SMS_SEND_FAILED' : 'OTP_SEND_ERROR',
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { shopId, otp } = req.body;

    if (!shopId?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }
    if (otp === undefined || otp === null || otp === '') {
      return res.status(400).json({ success: false, message: 'OTP is required' });
    }

    const normalizedShopId = normalizeShopId(shopId);
    if (!isValidShopIdFormat(normalizedShopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }

    const parsedOtp = normalizeOtpInput(otp);
    if (parsedOtp === null) {
      return res.status(400).json({
        success: false,
        message: `OTP must be a ${OTP_LENGTH}-digit number`,
      });
    }

    const shop = await ShopsData.findOne({ shopId: normalizedShopId });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (!shop.otp || !shop.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new code.',
      });
    }

    if (Date.now() > new Date(shop.otpExpiresAt).getTime()) {
      shop.otp = null;
      shop.otpExpiresAt = null;
      await shop.save();
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new code.',
        otpTimerSeconds: 0,
      });
    }

    if (shop.otp !== parsedOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const remainingMs = new Date(shop.otpExpiresAt).getTime() - Date.now();
    const otpTimerSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

    shop.isVerifyPhoneNumber = true;
    shop.onboardStep = 'otpVerified';
    shop.otp = null;
    shop.otpExpiresAt = null;
    await shop.save();

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully',
      shopId: normalizedShopId,
      isVerifyPhoneNumber: true,
      onboardStep: shop.onboardStep,
      otpTimerSeconds,
    });
  } catch (error) {
    console.log('error in verifyOtp', error);
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

    let shopLean = null;
    let trialExpired = false;

    if (user.shopId) {
      const shop = await ShopsData.findOne({ shopId: user.shopId }).lean();
      if (shop) {
        shopLean = shop;

        if (shop.onboardStep !== 'completed') {
          return res.status(403).json({
            success: false,
            message: 'Please complete onboarding before logging in.',
            code: 'ONBOARDING_INCOMPLETE',
            shopId: shop.shopId,
            onboardStep: shop.onboardStep,
            shop: formatShopForLogin(shop),
          });
        }

        trialExpired = isTrialEnded(shopLean);
      }
    }

    let token;
    let tokenExpiresInSeconds = 7 * 24 * 60 * 60;

    if (shopLean && isActiveTrial(shopLean)) {
      const trialToken = await createAndSaveTrialToken(user._id, shopLean);
      token = trialToken.token;
      tokenExpiresInSeconds = trialToken.tokenExpiresInSeconds;
    } else {
      token = await createAndSaveLoginToken(user._id);
    }

    const showTrialPrompt = shouldShowTrialPrompt(user, shopLean);

    res.status(200).json({
      success: true,
      message: trialExpired
        ? 'Login successful. Your trial has ended. Please subscribe to continue.'
        : 'Login successful',
      token,
      tokenExpiresInSeconds,
      showTrialPrompt,
      trialExpired,
      user: formatUserForLogin(user),
      shop: formatShopForLogin(shopLean),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    await clearUserToken(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      sessionEnded: true,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  signupOnboarding,
  sendOtp: sendOtpOnboarding,
  verifyOtp,
  login,
  logout,
};
