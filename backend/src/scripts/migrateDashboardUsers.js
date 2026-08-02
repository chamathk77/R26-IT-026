/**
 * One-time migration: move legacy dashboard accounts from `users` → `dashboardusers`
 * and normalize old role names (internalAdmin/internalStaff → admin/staff).
 *
 * Usage: npm run migrate:dashboard-users
 */
require('dotenv').config();

const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const DashboardUser = require('../models/dashboardUser');

const LEGACY_INTERNAL_ROLES = ['internalAdmin', 'internalStaff'];

const LEGACY_ROLE_MAP = {
  internalAdmin: 'admin',
  internalStaff: 'staff',
};

function normalizeDashboardRole(role) {
  if (DashboardUser.DASHBOARD_ROLES.includes(role)) {
    return role;
  }
  return LEGACY_ROLE_MAP[role] || 'staff';
}

async function upgradeExistingDashboardUserRoles() {
  const legacyUsers = await DashboardUser.find({
    role: { $in: LEGACY_INTERNAL_ROLES },
  }).lean();

  let upgraded = 0;
  for (const dashboardUser of legacyUsers) {
    const nextRole = normalizeDashboardRole(dashboardUser.role);
    await DashboardUser.findByIdAndUpdate(dashboardUser._id, { role: nextRole });
    upgraded += 1;
    console.log(`[migrate] Updated role for ${dashboardUser.email}: ${dashboardUser.role} → ${nextRole}`);
  }

  return upgraded;
}

async function migrateLegacyUsersFromShopCollection() {
  const usersCollection = mongoose.connection.collection('users');
  const legacyUsers = await usersCollection
    .find({
      $or: [
        { isInternalUser: true },
        { role: { $in: LEGACY_INTERNAL_ROLES } },
      ],
    })
    .toArray();

  if (!legacyUsers.length) {
    console.log('[migrate] No legacy dashboard users found in users collection.');
    return { migrated: 0, skipped: 0, deleted: 0, errors: [] };
  }

  let migrated = 0;
  let skipped = 0;
  let deleted = 0;
  const errors = [];

  for (const oldUser of legacyUsers) {
    const email = String(oldUser.email || '').trim().toLowerCase();
    const phone = String(oldUser.phone || '').trim();

    if (!email || !phone) {
      errors.push({ email, reason: 'Missing email or phone' });
      continue;
    }

    const existing = await DashboardUser.findOne({
      $or: [{ email }, { phone }, { _id: oldUser._id }],
    }).lean();

    if (existing) {
      skipped += 1;
      console.log(`[migrate] Skipped ${email} (already in dashboardusers)`);
    } else {
      const role = normalizeDashboardRole(oldUser.role);

      await DashboardUser.create({
        _id: oldUser._id,
        name: oldUser.name,
        email,
        phone,
        password: oldUser.password,
        role,
        note: oldUser.note || '',
        isActive: true,
        token: oldUser.token || null,
      });

      migrated += 1;
      console.log(`[migrate] Migrated ${email} (${role})`);
    }

    const deleteResult = await usersCollection.deleteOne({ _id: oldUser._id });
    if (deleteResult.deletedCount) {
      deleted += 1;
      console.log(`[migrate] Removed legacy user row for ${email} from users collection`);
    }
  }

  return { migrated, skipped, deleted, errors };
}

async function migrateDashboardUsers() {
  const upgraded = await upgradeExistingDashboardUserRoles();
  const fromUsers = await migrateLegacyUsersFromShopCollection();

  return {
    upgradedExistingDashboardUsers: upgraded,
    ...fromUsers,
  };
}

async function main() {
  await connectDatabase();
  console.log('[migrate] Starting dashboard user migration...');
  const report = await migrateDashboardUsers();
  console.log('[migrate] Done.');
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.errors?.length ? 1 : 0);
}

main().catch((error) => {
  console.error('[migrate] Failed:', error);
  process.exit(1);
});
