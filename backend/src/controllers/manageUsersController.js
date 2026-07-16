const User = require('../models/user');
const ShopsData = require('../models/shopsData');
const Branch = require('../models/branch');
const bcrypt = require('bcryptjs');

const OWNER_CREATABLE_ROLES = ['staff', 'admin'];

function normalizeShopId(shopId) {
  return String(shopId).trim().toUpperCase();
}

function isValidShopIdFormat(shopId) {
  return /^SI\d{6}$/.test(shopId);
}

function normalizeBranchId(branchId) {
  return String(branchId ?? '').trim().toUpperCase();
}

function shopMobileUserFilter(shopId) {
  return { shopId };
}

async function getShopMobileUserCount(shopId) {
  return User.countDocuments(shopMobileUserFilter(shopId));
}

function normalizeAllowedBranchIds(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map(normalizeBranchId).filter(Boolean))];
  }

  if (typeof input === 'string') {
    return [...new Set(input.split(',').map(normalizeBranchId).filter(Boolean))];
  }

  return [];
}

async function getActiveBranchesForShop(shopId) {
  return Branch.find({ shopId, isActive: true })
    .select('branchId branchName address phone isMainBranch isActive')
    .sort({ isMainBranch: -1, createdAt: 1 })
    .lean();
}

function mapBranch(branch) {
  return {
    branchId: normalizeBranchId(branch.branchId),
    branchName: branch.branchName,
    address: branch.address ?? '',
    phone: branch.phone ?? '',
    isMainBranch: Boolean(branch.isMainBranch),
    isActive: Boolean(branch.isActive),
  };
}

async function resolveAllowedBranchIds(shopId, requestedAllowedBranchIds) {
  const activeBranches = await getActiveBranchesForShop(shopId);
  const activeBranchIds = activeBranches.map((branch) => normalizeBranchId(branch.branchId));

  if (!activeBranchIds.length) {
    return {
      error: {
        status: 400,
        message: 'No active branch found for this shop.',
        code: 'SHOP_BRANCH_REQUIRED',
      },
    };
  }

  const normalizedRequested = normalizeAllowedBranchIds(requestedAllowedBranchIds);
  const invalidBranchIds = normalizedRequested.filter((branchId) => !activeBranchIds.includes(branchId));

  if (invalidBranchIds.length) {
    return {
      error: {
        status: 400,
        message: 'Some selected branches are invalid or inactive for this shop',
        code: 'INVALID_ALLOWED_BRANCH_IDS',
        invalidBranchIds,
      },
    };
  }

  return {
    allowedBranchIds: normalizedRequested,
    activeBranches,
  };
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
  const allowedBranchIds = normalizeAllowedBranchIds(body?.allowedBranchIds);

  return {
    shopId,
    name,
    email,
    phoneNumber: phoneNumberRaw,
    role,
    password,
    allowedBranchIds,
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
      allowedBranchIds: requestedAllowedBranchIds,
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

    const allowedBranchesResult = await resolveAllowedBranchIds(
      normalizedShopId,
      requestedAllowedBranchIds,
    );
    if (allowedBranchesResult.error) {
      return res.status(allowedBranchesResult.error.status).json({
        success: false,
        message: allowedBranchesResult.error.message,
        code: allowedBranchesResult.error.code,
        invalidBranchIds: allowedBranchesResult.error.invalidBranchIds,
      });
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
      allowedBranchIds: allowedBranchesResult.allowedBranchIds,
    });

    return res.status(201).json({
      success: true,
      shopId: user.shopId,
      name: user.name,
      email: user.email,
      phoneNumber: user.phone,
      role: user.role,
      allowedBranchIds: user.allowedBranchIds,
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

    const users = await User.find(shopMobileUserFilter(ownerShopId))
      .select('name email phone role shopId allowedBranchIds createdAt updatedAt')
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
        allowedBranchIds: Array.isArray(user.allowedBranchIds) ? user.allowedBranchIds : [],
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
      ...shopMobileUserFilter(ownerShopId),
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
    const requestedAllowedBranchIds = normalizeAllowedBranchIds(req.body?.allowedBranchIds);

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

    const allowedBranchesResult = await resolveAllowedBranchIds(
      ownerShopId,
      requestedAllowedBranchIds,
    );
    if (allowedBranchesResult.error) {
      return res.status(allowedBranchesResult.error.status).json({
        success: false,
        message: allowedBranchesResult.error.message,
        code: allowedBranchesResult.error.code,
        invalidBranchIds: allowedBranchesResult.error.invalidBranchIds,
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
    user.allowedBranchIds = allowedBranchesResult.allowedBranchIds;
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
        allowedBranchIds: user.allowedBranchIds,
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
      ...shopMobileUserFilter(ownerShopId),
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

const getLoggedUserBranches = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('shopId allowedBranchIds role').lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    const shopId = normalizeShopId(user.shopId);
    if (!shopId) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not linked to a shop',
      });
    }

    const activeBranches = await getActiveBranchesForShop(shopId);
    const allowedBranchIds = normalizeAllowedBranchIds(user.allowedBranchIds);

    const branches =
      user.role === 'owner' && allowedBranchIds.length === 0
        ? activeBranches.map(mapBranch)
        : activeBranches
            .filter((branch) => allowedBranchIds.includes(normalizeBranchId(branch.branchId)))
            .map(mapBranch);

    return res.status(200).json({
      success: true,
      shopId,
      allowedBranchIds,
      count: branches.length,
      data: branches,
      message: 'Logged user branches loaded successfully',
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
  getLoggedUserBranches,
};
