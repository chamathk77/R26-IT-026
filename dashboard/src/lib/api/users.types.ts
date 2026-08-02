export type DashboardRole = 'admin' | 'staff';

export interface ManagedDashboardUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: DashboardRole | string;
  note: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardUsersListPermissions {
  canCreate: boolean;
  canDelete: boolean;
  canEditAll: boolean;
}

export interface DashboardUsersResponse {
  success: boolean;
  count: number;
  currentUserId: string;
  currentUserRole: DashboardRole | string;
  permissions: DashboardUsersListPermissions;
  users: ManagedDashboardUser[];
}

export interface DashboardUserDetailsPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canEditRole: boolean;
  canEditActive: boolean;
  isSelf: boolean;
}

export interface DashboardUserDetailsResponse {
  success: boolean;
  user: ManagedDashboardUser;
  currentUserId: string;
  currentUserRole: DashboardRole | string;
  permissions: DashboardUserDetailsPermissions;
}

export interface CreateDashboardUserPayload {
  name: string;
  email: string;
  phone: string;
  role: DashboardRole;
  password: string;
  note?: string;
  isActive?: boolean;
}

export interface CreateDashboardUserResponse {
  success: boolean;
  message: string;
  user: ManagedDashboardUser;
}

export interface UpdateDashboardUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  role?: DashboardRole;
  note?: string;
  password?: string;
  isActive?: boolean;
}

export interface UpdateDashboardUserResponse {
  success: boolean;
  message: string;
  user: ManagedDashboardUser;
  permissions: DashboardUserDetailsPermissions;
}

export interface DeleteDashboardUserResponse {
  success: boolean;
  message: string;
  deletedUser: ManagedDashboardUser;
}
