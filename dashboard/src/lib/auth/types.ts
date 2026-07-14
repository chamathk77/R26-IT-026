export type DashboardRole = 'admin' | 'staff';

export interface DashboardUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: DashboardRole;
  note?: string;
  isActive?: boolean;
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
