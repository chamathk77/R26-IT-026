const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { sendSms } = require('../services/smsService');
const { clearUserToken } = require('../utils/tokenHelper');

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300;
const RESET_TOKEN_EXPIRY = '15m';
const RESET_TOKEN_PURPOSE = 'password_reset';
const LOCAL_MOBILE_PATTERN = /^0\d{9}$/;

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

function normalizePhone(phone) {
  return phone != null ? String(phone).trim() : '';
}

function isValidLocalMobileNumber(value) {
  return LOCAL_MOBILE_PATTERN.test(value);
}

function generatePasswordResetToken(phone) {
  return jwt.sign(
    { phone, purpose: RESET_TOKEN_PURPOSE },
    process.env.JWT_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRY },
  );
}

function verifyPasswordResetToken(token, phone) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== RESET_TOKEN_PURPOSE) {
    throw new Error('Invalid reset token');
  }
  if (decoded.phone !== phone) {
    throw new Error('Invalid reset token');
  }
  return decoded;
}

const sendForgotPasswordOtp = async (req, res) => {
  try {
    const phoneTrimmed = normalizePhone(req.body?.phone);

    if (!phoneTrimmed) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required',
      });
    }

    if (!isValidLocalMobileNumber(phoneTrimmed)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be 10 digits and start with 0 (e.g. 0712345678).',
      });
    }

    const user = await User.findOne({ phone: phoneTrimmed });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found for this mobile number.',
        code: 'USER_NOT_FOUND',
      });
    }

    const otpCode = generateSixDigitOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
    const message = `Your Smart Cost password reset code is ${otpCode}. Valid for ${OTP_EXPIRY_SECONDS / 60} minutes. Do not share this code.`;

    await sendSms({
      to: phoneTrimmed,
      message,
    });

    user.otp = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      phone: phoneTrimmed,
      maskedPhone: maskMobileNumber(phoneTrimmed),
      otpTimerSeconds: OTP_EXPIRY_SECONDS,
    });
  } catch (error) {
    console.log('error in sendForgotPasswordOtp', error.response?.data || error.message);

    const isSmsApiError = error.code === 'SMS_API_ERROR';
    const statusCode = isSmsApiError && error.httpStatus ? error.httpStatus : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to send OTP',
      code: isSmsApiError ? 'SMS_SEND_FAILED' : 'FORGOT_PASSWORD_OTP_SEND_ERROR',
    });
  }
};

const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const phoneTrimmed = normalizePhone(req.body?.phone);
    const { otp } = req.body;

    if (!phoneTrimmed) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required',
      });
    }

    if (!isValidLocalMobileNumber(phoneTrimmed)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be 10 digits and start with 0 (e.g. 0712345678).',
      });
    }

    if (otp === undefined || otp === null || otp === '') {
      return res.status(400).json({
        success: false,
        message: 'OTP is required',
      });
    }

    const parsedOtp = normalizeOtpInput(otp);
    if (parsedOtp === null) {
      return res.status(400).json({
        success: false,
        message: `OTP must be a ${OTP_LENGTH}-digit number`,
      });
    }

    const user = await User.findOne({ phone: phoneTrimmed });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found for this mobile number.',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new code.',
      });
    }

    if (Date.now() > new Date(user.otpExpiresAt).getTime()) {
      user.otp = null;
      user.otpExpiresAt = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new code.',
        otpTimerSeconds: 0,
      });
    }

    if (user.otp !== parsedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    const resetToken = generatePasswordResetToken(phoneTrimmed);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      phone: phoneTrimmed,
      maskedPhone: maskMobileNumber(phoneTrimmed),
      resetToken,
    });
  } catch (error) {
    console.log('error in verifyForgotPasswordOtp', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify OTP',
    });
  }
};

const resetForgotPassword = async (req, res) => {
  try {
    const phoneTrimmed = normalizePhone(req.body?.phone);
    const { resetToken, password, confirmPassword } = req.body;

    if (!phoneTrimmed || !resetToken || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number, reset token, password, and confirm password are required',
      });
    }

    if (!isValidLocalMobileNumber(phoneTrimmed)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be 10 digits and start with 0 (e.g. 0712345678).',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    try {
      verifyPasswordResetToken(resetToken, phoneTrimmed);
    } catch (tokenError) {
      return res.status(400).json({
        success: false,
        message: 'Reset session expired or invalid. Please verify OTP again.',
        code: 'INVALID_RESET_TOKEN',
      });
    }

    const user = await User.findOne({ phone: phoneTrimmed });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found for this mobile number.',
        code: 'USER_NOT_FOUND',
      });
    }

    user.password = await bcrypt.hash(String(password), 10);
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();
    await clearUserToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully. Please sign in with your new password.',
    });
  } catch (error) {
    console.log('error in resetForgotPassword', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset password',
    });
  }
};

module.exports = {
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetForgotPassword,
};
