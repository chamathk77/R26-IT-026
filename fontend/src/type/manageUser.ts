export type ManageUserRole = 'admin' | 'staff';

export interface ShopUser {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  shopId: string;
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
}

export interface CreateShopUserResponse {
  success: boolean;
  shopId: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
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
