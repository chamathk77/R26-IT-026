const User = require('../models/user');
const ShopsData = require('../models/shopsData');
const Branch = require('../models/branch');
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

function normalizeBranchId(branchId) {
  return String(branchId ?? '').trim().toUpperCase();
}

/**
 * Login branch context from Branch collection:
 * - 0 active → error
 * - 1 active → embed that branchId in token
 * - multiple → shopId-only session token; client must select a branch next
 */
async function resolveLoginBranchContext(shopId) {
  const normalizedShopId = normalizeShopId(shopId);
  const branches = await Branch.find({ shopId: normalizedShopId, isActive: true })
    .select('branchId branchName address phone isMainBranch isActive')
    .sort({ isMainBranch: -1, createdAt: 1 })
    .lean();

  if (!branches.length) {
    return {
      error: {
        status: 400,
        body: {
          success: false,
          message: 'No active branch found for this shop.',
          code: 'SHOP_BRANCH_REQUIRED',
        },
      },
    };
  }

  const mapped = branches.map((b) => ({
    branchId: normalizeBranchId(b.branchId),
    branchName: b.branchName,
    address: b.address ?? '',
    phone: b.phone ?? '',
    isMainBranch: Boolean(b.isMainBranch),
  }));

  if (mapped.length === 1) {
    return {
      branchId: mapped[0].branchId,
      needsBranchSelection: false,
      branches: mapped,
    };
  }

  return {
    branchId: null,
    needsBranchSelection: true,
    branches: mapped,
  };
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

    const shopBranch =
      (await Branch.findOne({
        shopId: normalizedShopId,
        isMainBranch: true,
        isActive: true,
      })
        .select('branchId')
        .lean()) ||
      (await Branch.findOne({ shopId: normalizedShopId, isActive: true })
        .select('branchId')
        .sort({ createdAt: 1 })
        .lean());

    if (!shopBranch?.branchId) {
      return res.status(400).json({
        success: false,
        message: 'No branch found for this shop. Complete shop branch setup first.',
        code: 'SHOP_BRANCH_REQUIRED',
      });
    }

    const allowedBranchIds = [normalizeBranchId(shopBranch.branchId)];

    const user = await User.create({
      name: name.trim(),
      email: emailLower,
      phone: phoneTrimmed,
      password: hashedPassword,
      role: roleNormalized,
      shopId: normalizedShopId,
      allowedBranchIds,
    });

    await ShopsData.updateOne(
      { shopId: normalizedShopId },
      { $set: { onboardStep: 'passwordSet' } },
    );

    res.status(201).json({
      success: true,
      shopId: user.shopId,
      allowedBranchIds: user.allowedBranchIds,
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
    let branchId = null;
    let needsBranchSelection = false;
    let branches = [];

    if (!user.shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop is required to create a login session.',
        code: 'SHOP_REQUIRED',
      });
    }

    const shopId = normalizeShopId(user.shopId);
    const branchResolved = await resolveLoginBranchContext(shopId);
    if (branchResolved.error) {
      return res
        .status(branchResolved.error.status)
        .json(branchResolved.error.body);
    }

    branchId = branchResolved.branchId;
    needsBranchSelection = branchResolved.needsBranchSelection;
    branches = branchResolved.branches;

    const tokenClaims = { shopId };
    if (branchId) {
      tokenClaims.branchId = branchId;
    }

    if (shopLean && isActiveTrial(shopLean)) {
      const trialToken = await createAndSaveTrialToken(
        user._id,
        shopLean,
        branchId,
      );
      token = trialToken.token;
      tokenExpiresInSeconds = trialToken.tokenExpiresInSeconds;
    } else {
      token = await createAndSaveLoginToken(user._id, '7d', tokenClaims);
    }

    const showTrialPrompt = shouldShowTrialPrompt(user, shopLean);

    res.status(200).json({
      success: true,
      message: trialExpired
        ? 'Login successful. Your trial has ended. Please subscribe to continue.'
        : needsBranchSelection
          ? 'Login successful. Please select a branch to continue.'
          : 'Login successful',
      token,
      tokenExpiresInSeconds,
      shopId,
      branchId,
      needsBranchSelection,
      branches: needsBranchSelection ? branches : undefined,
      showTrialPrompt,
      trialExpired,
      user: formatUserForLogin(user),
      shop: formatShopForLogin(shopLean),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const selectBranch = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.user?.shopId || '');
    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
        code: 'SHOP_REQUIRED',
      });
    }

    const branchId = normalizeBranchId(req.body?.branchId);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'branchId is required',
        code: 'BRANCH_ID_REQUIRED',
      });
    }

    const user = await User.findById(req.user.id)
      .select('shopId allowedBranchIds')
      .lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (normalizeShopId(user.shopId) !== shopId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this shop',
      });
    }

    const branch = await Branch.findOne({
      shopId,
      branchId,
      isActive: true,
    })
      .select('branchId branchName address phone isMainBranch')
      .lean();

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found or inactive for this shop',
        code: 'BRANCH_NOT_FOUND',
      });
    }

    const allowed = Array.isArray(user.allowedBranchIds)
      ? user.allowedBranchIds.map(normalizeBranchId).filter(Boolean)
      : [];

    // If allowedBranchIds is set, enforce access; empty means not restricted yet (owner onboarding)
    if (allowed.length > 0 && !allowed.includes(branchId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to access this branch',
        code: 'BRANCH_ACCESS_FORBIDDEN',
      });
    }

    const shop = await ShopsData.findOne({ shopId });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    // Replacing stored token invalidates the previous session token
    let token;
    let tokenExpiresInSeconds = 7 * 24 * 60 * 60;

    if (isActiveTrial(shop)) {
      const trialToken = await createAndSaveTrialToken(req.user.id, shop, branchId);
      token = trialToken.token;
      tokenExpiresInSeconds = trialToken.tokenExpiresInSeconds;
    } else {
      token = await createAndSaveLoginToken(req.user.id, '7d', {
        shopId,
        branchId,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Branch selected successfully',
      token,
      tokenExpiresInSeconds,
      shopId,
      branchId,
      needsBranchSelection: false,
      branch: {
        branchId: branch.branchId,
        branchName: branch.branchName,
        address: branch.address ?? '',
        phone: branch.phone ?? '',
        isMainBranch: Boolean(branch.isMainBranch),
      },
    });
  } catch (error) {
    console.log('error in selectBranch', error);
    return res.status(500).json({ success: false, message: error.message });
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
  selectBranch,
  logout,
};
