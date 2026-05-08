export type UserRole = 'owner' | 'admin' | 'staff';

export interface DummyUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

/** Seed list — edited in memory during the session only */
export const SEED_USERS: DummyUser[] = [
  {
    id: 'user-owner-1',
    name: 'Jordan Patel',
    email: 'jordan.patel@smartcost.com',
    phone: '+1 (415) 555-0142',
    role: 'owner',
  },
  {
    id: 'user-admin-1',
    name: 'Sam Rivera',
    email: 'sam.rivera@smartcost.com',
    phone: '+1 (415) 555-0198',
    role: 'admin',
  },
  {
    id: 'user-admin-2',
    name: 'Taylor Chen',
    email: 'taylor.chen@smartcost.com',
    phone: '+1 (415) 555-0167',
    role: 'admin',
  },
  {
    id: 'user-staff-1',
    name: 'Casey Morgan',
    email: 'casey.morgan@smartcost.com',
    phone: '+1 (415) 555-0134',
    role: 'staff',
  },
  {
    id: 'user-staff-2',
    name: 'Riley Brooks',
    email: 'riley.brooks@smartcost.com',
    phone: '+1 (415) 555-0179',
    role: 'staff',
  },
  {
    id: 'user-staff-3',
    name: 'Morgan Lee',
    email: 'morgan.lee@smartcost.com',
    phone: '+1 (415) 555-0120',
    role: 'staff',
  },
];

/** Logged-in user id for dummy session — change to test admin/staff flows */
export const DEFAULT_CURRENT_USER_ID = 'user-owner-1';

export function getManageableUsers(viewer: DummyUser, all: DummyUser[]): DummyUser[] {
  const others = all.filter((u) => u.id !== viewer.id);
  if (viewer.role === 'owner') {
    return others.filter((u) => u.role === 'admin' || u.role === 'staff');
  }
  if (viewer.role === 'admin') {
    return others.filter((u) => u.role === 'staff');
  }
  return [];
}
