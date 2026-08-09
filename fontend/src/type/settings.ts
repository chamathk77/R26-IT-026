import type { LoginShop, LoginUser } from './auth';

export interface GetSettingsDataResponse {
  success: boolean;
  message: string;
  shopId: string;
  shop: LoginShop;
  user: LoginUser;
}
