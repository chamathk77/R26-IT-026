export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  shopId?: string;
  isFirsttimeLogin?: boolean;
  isInternalUser?: boolean;
  [key: string]: unknown;
}

export interface LoginShop {
  _id?: string;
  shopId?: string;
  shopName?: string;
  address?: string;
  shopMobileNumber?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerMobileNumber?: string;
  email?: string;
  isVerifyEmail?: boolean;
  isVerifyPhoneNumber?: boolean;
  onboardStep?: string;
  sendReceiptSms?: boolean;
  kpi?: boolean;
  analyticsModule?: boolean;
  smsMobileNumber?: boolean;
  customerManualOrder?: boolean;
  costModule?: boolean;
  marketingModule?: boolean;
  maxUsers?: number;
  status?: string;
  trailStartDate?: string | null;
  trailEndDate?: string | null;
  isTrailStared?: boolean;
  isTrailCompleted?: boolean;
  [key: string]: unknown;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  tokenExpiresInSeconds?: number;
  showTrialPrompt?: boolean;
  trialExpired?: boolean;
  user: LoginUser;
  shop: LoginShop | null;
}

export interface SignUpRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

export interface SignUpResponse {
  success: boolean;
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  message: string;
  token: string;
}
