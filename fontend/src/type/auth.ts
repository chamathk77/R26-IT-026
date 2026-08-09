import type {
  AutomotiveModuleFlags,
  IndustryType,
  RestaurantModuleFlags,
  SalonModuleFlags,
} from './industry';

export type { IndustryType } from './industry';

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
  nextPaymentDate?: string | null;
  subscriptionDueDays?: number | null;
  subscriptionType?: string | null;
  isSubscriptionChangePending?: boolean;
  industryType?: IndustryType;
  restaurantModule?: RestaurantModuleFlags | null;
  salonModule?: SalonModuleFlags | null;
  automotiveModule?: AutomotiveModuleFlags | null;
  [key: string]: unknown;
}

export interface LoginBranch {
  branchId: string;
  branchName: string;
  address?: string;
  phone?: string;
  isMainBranch?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  tokenExpiresInSeconds?: number;
  shopId?: string | null;
  branchId?: string | null;
  /** false = one branch already in token; true = must call select-branch */
  needsBranchSelection: boolean;
  branches?: LoginBranch[];
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
