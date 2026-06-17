const User = require('../models/user');
const ShopsData = require('../models/shopsData');
const bcrypt = require('bcryptjs');

const OWNER_CREATABLE_ROLES = ['staff', 'admin'];

function normalizeShopId(shopId) {
  return String(shopId).trim().toUpperCase();
}

function isValidShopIdFormat(shopId) {
  return /^SI\d{6}$/.test(shopId);
}

function shopMobileUserFilter(shopId) {
  return {
    shopId,
    isInternalUser: { $ne: true },
  };
}

async function getShopMobileUserCount(shopId) {
  return User.countDocuments(shopMobileUserFilter(shopId));
}

async function getOwnerAccessContext(userId) {
  const owner = await User.findById(userId).select('role shopId').lean();
  if (!owner) {
    return { error: { status: 401, message: 'Not authorized, user not found' } };
  }
  if (owner.role !== 'owner') {
    return { error: { status: 403, message: 'Only owner can manage users' } };
  }
  const ownerShopId = owner.shopId ? String(owner.shopId).trim().toUpperCase() : '';
  if (!ownerShopId) {
    return { error: { status: 403, message: 'Your account is not linked to a shop' } };
  }
  return { ownerShopId };
}

function normalizeOwnerCreatePayload(body) {
  const shopId = body?.shopId != null ? String(body.shopId).trim() : '';
  const name = body?.name != null ? String(body.name).trim() : '';
  const email = body?.email != null ? String(body.email).trim().toLowerCase() : '';
  const phoneNumberRaw =
    body?.phoneNumber != null
      ? String(body.phoneNumber).trim()
      : body?.phone != null
        ? String(body.phone).trim()
        : '';
  const role = body?.role != null ? String(body.role).trim().toLowerCase() : '';
  const password = body?.password != null ? String(body.password) : '';

  return {
    shopId,
    name,
    email,
    phoneNumber: phoneNumberRaw,
    role,
    password,
  };
}

const createShopUser = async (req, res) => {
  try {
    const {
      shopId,
      name,
      email,
      phoneNumber: phoneTrimmed,
      role: roleNormalized,
      password,
    } = normalizeOwnerCreatePayload(req.body);

    if (!shopId?.trim()) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }
    if (!name || !email || !password || !roleNormalized || !phoneTrimmed) {
      return res.status(400).json({
        success: false,
        message: 'shopId, name, email, phoneNumber, role and password are required',
      });
    }

    const normalizedShopId = normalizeShopId(shopId);
    if (!isValidShopIdFormat(normalizedShopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id format' });
    }

    const ownerAccess = await getOwnerAccessContext(req.user.id);
    if (ownerAccess.error) {
      return res
        .status(ownerAccess.error.status)
        .json({ success: false, message: ownerAccess.error.message });
    }
    const { ownerShopId } = ownerAccess;

    if (normalizedShopId !== ownerShopId) {
      return res.status(403).json({
        success: false,
        message: 'You can only create users for your own shop',
      });
    }

    const shop = await ShopsData.findOne({ shopId: normalizedShopId }).lean();
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const maxUsers = shop.maxUsers ?? 3;
    const currentUserCount = await getShopMobileUserCount(ownerShopId);

    if (currentUserCount >= maxUsers) {
      return res.status(400).json({
        success: false,
        code: 'MAX_USERS_EXCEEDED',
        message: 'Your maximum user count is exceeded. Please contact admin.',
        shopId: ownerShopId,
        maxUsers,
        currentUsers: currentUserCount,
      });
    }

    if (!OWNER_CREATABLE_ROLES.includes(roleNormalized)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be admin or staff',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { phone: phoneTrimmed }],
    });
    if (existingUser) {
      const msg =
        existingUser.email === email
          ? 'User already exists with this email'
          : 'User already exists with this phone number';
      return res.status(400).json({ success: false, message: msg });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email,
      phone: phoneTrimmed,
      password: hashedPassword,
      role: roleNormalized,
      shopId: normalizedShopId,
    });

    return res.status(201).json({
      success: true,
      shopId: user.shopId,
      name: user.name,
      email: user.email,
      phoneNumber: user.phone,
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
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getShopUsers = async (req, res) => {
  try {
    const ownerAccess = await getOwnerAccessContext(req.user.id);
    if (ownerAccess.error) {
      return res
        .status(ownerAccess.error.status)
        .json({ success: false, message: ownerAccess.error.message });
    }
    const { ownerShopId } = ownerAccess;

    const users = await User.find({
      shopId: ownerShopId,
      isInternalUser: { $ne: true },
    })
      .select('name email phone role shopId createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phone,
        role: user.role,
        shopId: user.shopId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      message: 'Users loaded successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateShopUser = async (req, res) => {
  try {
    const ownerAccess = await getOwnerAccessContext(req.user.id);
    if (ownerAccess.error) {
      return res
        .status(ownerAccess.error.status)
        .json({ success: false, message: ownerAccess.error.message });
    }
    const { ownerShopId } = ownerAccess;

    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const user = await User.findOne({
      _id: userId,
      shopId: ownerShopId,
      isInternalUser: { $ne: true },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Owner account cannot be updated from this endpoint',
      });
    }

    const name = req.body?.name != null ? String(req.body.name).trim() : '';
    const email = req.body?.email != null ? String(req.body.email).trim().toLowerCase() : '';
    const phoneNumber =
      req.body?.phoneNumber != null
        ? String(req.body.phoneNumber).trim()
        : req.body?.phone != null
          ? String(req.body.phone).trim()
          : '';
    const role = req.body?.role != null ? String(req.body.role).trim().toLowerCase() : '';
    const password = req.body?.password != null ? String(req.body.password) : '';

    if (!name || !email || !phoneNumber || !role) {
      return res.status(400).json({
        success: false,
        message: 'name, email, phoneNumber and role are required',
      });
    }
    if (!OWNER_CREATABLE_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be admin or staff',
      });
    }

    const duplicate = await User.findOne({
      _id: { $ne: userId },
      $or: [{ email }, { phone: phoneNumber }],
    }).lean();
    if (duplicate) {
      const msg =
        duplicate.email === email
          ? 'User already exists with this email'
          : 'User already exists with this phone number';
      return res.status(400).json({ success: false, message: msg });
    }

    user.name = name;
    user.email = email;
    user.phone = phoneNumber;
    user.role = role;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phone,
        role: user.role,
        shopId: user.shopId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      message: 'User updated successfully',
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const message =
        field === 'phone'
          ? 'Phone number already registered'
          : field === 'email'
            ? 'User already exists with this email'
            : 'User already exists';
      return res.status(400).json({ success: false, message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteShopUser = async (req, res) => {
  try {
    const ownerAccess = await getOwnerAccessContext(req.user.id);
    if (ownerAccess.error) {
      return res
        .status(ownerAccess.error.status)
        .json({ success: false, message: ownerAccess.error.message });
    }
    const { ownerShopId } = ownerAccess;

    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const user = await User.findOne({
      _id: userId,
      shopId: ownerShopId,
      isInternalUser: { $ne: true },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Owner account cannot be deleted from this endpoint',
      });
    }

    await User.deleteOne({ _id: user._id });

    return res.status(200).json({
      success: true,
      id: user._id,
      message: 'User deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createShopUser,
  getShopUsers,
  updateShopUser,
  deleteShopUser,
};
