const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const DashboardUser = require('../../models/dashboardUser');
const User = require('../../models/user');

const { DASHBOARD_ROLES } = DashboardUser;

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function isAdminRole(role) {
  return role === 'admin';
}

function formatDashboardUser(user) {
  if (!user) return null;
  const data = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete data.password;
  delete data.token;
  delete data.__v;
  return {
    _id: String(data._id),
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    note: data.note ?? '',
    isActive: data.isActive !== false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

async function assertEmailPhoneAvailable({
  email,
  phone,
  excludeUserId = null,
}) {
  const or = [];
  if (email) or.push({ email });
  if (phone) or.push({ phone });
  if (!or.length) return null;

  const dashboardQuery = { $or: or };
  if (excludeUserId) {
    dashboardQuery._id = { $ne: excludeUserId };
  }

  const [existingDashboardUser, existingShopUser] = await Promise.all([
    DashboardUser.findOne(dashboardQuery).lean(),
    User.findOne({ $or: or }).lean(),
  ]);

  const existing = existingDashboardUser ?? existingShopUser;
  if (!existing) return null;

  if (email && existing.email === email) {
    return 'User already exists with this email';
  }
  if (phone && existing.phone === phone) {
    return 'User already exists with this phone number';
  }
  return 'Email or phone number is already registered';
}

/**
 * GET /api/dashboard/users
 * Any authenticated dashboard user can list all dashboard users.
 */
const getDashboardUsers = async (req, res) => {
  try {
    const users = await DashboardUser.find()
      .select('-password -token -__v')
      .sort({ createdAt: -1 })
      .lean();

    const mapped = users.map(formatDashboardUser);

    res.status(200).json({
      success: true,
      count: mapped.length,
      currentUserId: String(req.user.id),
      currentUserRole: req.user.role,
      permissions: {
        canCreate: isAdminRole(req.user.role),
        canDelete: isAdminRole(req.user.role),
        canEditAll: isAdminRole(req.user.role),
      },
      users: mapped,
    });
  } catch (error) {
    console.log('error in getDashboardUsers', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/dashboard/users/:userId
 * Any authenticated dashboard user can view details.
 */
const getDashboardUserDetails = async (req, res) => {
  try {
    const userId = String(req.params.userId || '').trim();

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid user id is required',
      });
    }

    const user = await DashboardUser.findById(userId)
      .select('-password -token -__v')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard user not found',
      });
    }

    const isSelf = String(req.user.id) === String(user._id);
    const canEdit = isAdminRole(req.user.role) || isSelf;
    const canDelete = isAdminRole(req.user.role) && !isSelf;

    res.status(200).json({
      success: true,
      user: formatDashboardUser(user),
      currentUserId: String(req.user.id),
      currentUserRole: req.user.role,
      permissions: {
        canEdit,
        canDelete,
        canEditRole: isAdminRole(req.user.role),
        canEditActive: isAdminRole(req.user.role),
        isSelf,
      },
    });
  } catch (error) {
    console.log('error in getDashboardUserDetails', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/users
 * Admin only — create a new dashboard user.
 */
const createDashboardUser = async (req, res) => {
  try {
    if (!isAdminRole(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only dashboard admins can create users',
        code: 'DASHBOARD_ADMIN_REQUIRED',
      });
    }

    const { name, email, phone, role, note, password, isActive } = req.body || {};

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

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    if (!DASHBOARD_ROLES.includes(roleNormalized)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${DASHBOARD_ROLES.join(', ')}`,
        allowedRoles: DASHBOARD_ROLES,
      });
    }

    const conflict = await assertEmailPhoneAvailable({
      email: emailLower,
      phone: phoneTrimmed,
    });
    if (conflict) {
      return res.status(400).json({ success: false, message: conflict });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const user = await DashboardUser.create({
      name: nameTrimmed,
      email: emailLower,
      phone: phoneTrimmed,
      password: hashedPassword,
      role: roleNormalized,
      note: noteTrimmed,
      isActive: isActive === false ? false : true,
    });

    res.status(201).json({
      success: true,
      message: 'Dashboard user created successfully',
      user: formatDashboardUser(user),
    });
  } catch (error) {
    console.log('error in createDashboardUser', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is already registered',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/dashboard/users/:userId
 * Admin can update any user. Staff can update only their own profile
 * (name, email, phone, note, password — not role / isActive).
 */
const updateDashboardUser = async (req, res) => {
  try {
    const userId = String(req.params.userId || '').trim();

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid user id is required',
      });
    }

    const target = await DashboardUser.findById(userId);
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard user not found',
      });
    }

    const isSelf = String(req.user.id) === String(target._id);
    const admin = isAdminRole(req.user.role);

    if (!admin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Staff can only edit their own profile',
        code: 'EDIT_SELF_ONLY',
      });
    }

    const body = req.body || {};
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

    if (has('name')) {
      const nameTrimmed = String(body.name ?? '').trim();
      if (!nameTrimmed) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty',
        });
      }
      target.name = nameTrimmed;
    }

    if (has('phone')) {
      const phoneTrimmed = String(body.phone ?? '').trim();
      if (!phoneTrimmed) {
        return res.status(400).json({
          success: false,
          message: 'Phone cannot be empty',
        });
      }
      const conflict = await assertEmailPhoneAvailable({
        phone: phoneTrimmed,
        excludeUserId: target._id,
      });
      if (conflict) {
        return res.status(400).json({ success: false, message: conflict });
      }
      target.phone = phoneTrimmed;
    }

    if (has('note')) {
      target.note = body.note == null ? '' : String(body.note).trim();
    }

    if (has('password')) {
      const password = String(body.password ?? '');
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters',
          });
        }
        target.password = await bcrypt.hash(password, 10);
        target.token = null;
      }
    }

    if (has('email')) {
      const emailLower = String(body.email ?? '').trim().toLowerCase();
      if (!emailLower) {
        return res.status(400).json({
          success: false,
          message: 'Email cannot be empty',
        });
      }
      const conflict = await assertEmailPhoneAvailable({
        email: emailLower,
        excludeUserId: target._id,
      });
      if (conflict) {
        return res.status(400).json({ success: false, message: conflict });
      }
      target.email = emailLower;
    }

    if (admin) {
      if (has('role')) {
        const roleNormalized = String(body.role ?? '').trim();
        if (!DASHBOARD_ROLES.includes(roleNormalized)) {
          return res.status(400).json({
            success: false,
            message: `Role must be one of: ${DASHBOARD_ROLES.join(', ')}`,
            allowedRoles: DASHBOARD_ROLES,
          });
        }
        if (isSelf && roleNormalized !== 'admin') {
          return res.status(400).json({
            success: false,
            message: 'You cannot remove your own admin role',
          });
        }
        target.role = roleNormalized;
      }

      if (has('isActive')) {
        const nextActive =
          body.isActive === true ||
          body.isActive === 'true' ||
          body.isActive === 1 ||
          body.isActive === '1';
        const nextInactive =
          body.isActive === false ||
          body.isActive === 'false' ||
          body.isActive === 0 ||
          body.isActive === '0';

        if (!nextActive && !nextInactive) {
          return res.status(400).json({
            success: false,
            message: 'isActive must be a boolean',
          });
        }

        if (isSelf && nextInactive) {
          return res.status(400).json({
            success: false,
            message: 'You cannot deactivate your own account',
          });
        }

        target.isActive = nextActive;
        if (!target.isActive) {
          target.token = null;
        }
      }
    } else if (has('role') || has('isActive')) {
      return res.status(403).json({
        success: false,
        message: 'Staff cannot change role or active status',
        code: 'STAFF_FIELD_RESTRICTED',
      });
    }

    await target.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: formatDashboardUser(target),
      permissions: {
        canEdit: true,
        canDelete: admin && !isSelf,
        canEditRole: admin,
        canEditActive: admin,
        isSelf,
      },
    });
  } catch (error) {
    console.log('error in updateDashboardUser', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is already registered',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/dashboard/users/:userId
 * Admin only. Staff cannot delete. Admins cannot delete themselves.
 */
const deleteDashboardUser = async (req, res) => {
  try {
    if (!isAdminRole(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only dashboard admins can delete users',
        code: 'DASHBOARD_ADMIN_REQUIRED',
      });
    }

    const userId = String(req.params.userId || '').trim();

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid user id is required',
      });
    }

    if (String(req.user.id) === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    const user = await DashboardUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard user not found',
      });
    }

    const snapshot = formatDashboardUser(user);
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: snapshot,
    });
  } catch (error) {
    console.log('error in deleteDashboardUser', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardUsers,
  getDashboardUserDetails,
  createDashboardUser,
  updateDashboardUser,
  deleteDashboardUser,
};
