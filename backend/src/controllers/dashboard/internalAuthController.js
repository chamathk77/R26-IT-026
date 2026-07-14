const bcrypt = require('bcryptjs');
const DashboardUser = require('../../models/dashboardUser');
const User = require('../../models/user');
const {
  createAndSaveDashboardLoginToken,
  clearDashboardUserToken,
} = require('../../utils/dashboardTokenHelper');
const { formatUserForLogin } = require('../../utils/trialPromptHelper');

const DASHBOARD_TOKEN_SECONDS = 7 * 24 * 60 * 60;

const internalLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const emailLower = email != null ? String(email).trim().toLowerCase() : '';

    if (!emailLower || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await DashboardUser.findOne({ email: emailLower });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'This dashboard account has been deactivated',
        code: 'DASHBOARD_USER_INACTIVE',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = await createAndSaveDashboardLoginToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Dashboard login successful',
      token,
      tokenExpiresInSeconds: DASHBOARD_TOKEN_SECONDS,
      user: formatUserForLogin(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const internalSignup = async (req, res) => {
  try {
    const { name, email, phone, role, note, password } = req.body;

    const nameTrimmed = name != null ? String(name).trim() : '';
    const emailLower = email != null ? String(email).trim().toLowerCase() : '';
    const phoneTrimmed = phone != null ? String(phone).trim() : '';
    const noteTrimmed = note != null ? String(note).trim() : '';
    const roleNormalized = role != null ? String(role).trim() : '';

    if (!nameTrimmed || !emailLower || !phoneTrimmed || !roleNormalized || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, role, and password are required',
      });
    }

    if (!DashboardUser.DASHBOARD_ROLES.includes(roleNormalized)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${DashboardUser.DASHBOARD_ROLES.join(', ')}`,
      });
    }

    const [existingDashboardUser, existingShopUser] = await Promise.all([
      DashboardUser.findOne({
        $or: [{ email: emailLower }, { phone: phoneTrimmed }],
      }).lean(),
      User.findOne({
        $or: [{ email: emailLower }, { phone: phoneTrimmed }],
      }).lean(),
    ]);

    const existingUser = existingDashboardUser ?? existingShopUser;
    if (existingUser) {
      const msg =
        existingUser.email === emailLower
          ? 'User already exists with this email'
          : 'User already exists with this phone number';
      return res.status(400).json({ success: false, message: msg });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await DashboardUser.create({
      name: nameTrimmed,
      email: emailLower,
      phone: phoneTrimmed,
      password: hashedPassword,
      role: roleNormalized,
      note: noteTrimmed,
    });

    res.status(201).json({
      success: true,
      message: 'Dashboard user created successfully',
      user: formatUserForLogin(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is already registered',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const internalLogout = async (req, res) => {
  try {
    await clearDashboardUserToken(req.user.id);
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
  internalLogin,
  internalSignup,
  internalLogout,
};
