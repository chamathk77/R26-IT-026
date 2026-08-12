export type InternalRole = 'admin' | 'staff' | 'internalAdmin' | 'internalStaff';

export function isDashboardAdmin(role?: string | null): boolean {
  return role === 'admin' || role === 'internalAdmin';
}

export interface DashboardUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: InternalRole;
  isInternalUser: boolean;
  note?: string;
  shopId?: string;
  isFirsttimeLogin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  tokenExpiresInSeconds: number;
  user: DashboardUser;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code?: string;
}
