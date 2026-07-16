export type ManageUserRole = 'admin' | 'staff';

export interface ManageUserBranch {
  branchId: string;
  branchName: string;
  address?: string;
  phone?: string;
  isMainBranch?: boolean;
  isActive?: boolean;
}

export interface ShopUser {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  shopId: string;
  allowedBranchIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GetShopUsersResponse {
  success: boolean;
  count: number;
  data: ShopUser[];
  message: string;
}

export interface CreateShopUserRequest {
  shopId: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: ManageUserRole;
  password: string;
  allowedBranchIds: string[];
}

export interface CreateShopUserResponse {
  success: boolean;
  shopId: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  allowedBranchIds?: string[];
  message: string;
  maxUsers?: number;
  currentUsers?: number;
  code?: string;
}

export interface UpdateShopUserRequest {
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: ManageUserRole;
  password?: string;
  allowedBranchIds: string[];
}

export interface UpdateShopUserResponse {
  success: boolean;
  data: ShopUser;
  message: string;
}

export interface DeleteShopUserResponse {
  success: boolean;
  id: string;
  message: string;
}

export interface GetLoggedUserBranchesResponse {
  success: boolean;
  shopId: string;
  allowedBranchIds: string[];
  count: number;
  data: ManageUserBranch[];
  message: string;
}
