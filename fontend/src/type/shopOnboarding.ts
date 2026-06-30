export interface CreateShopOnboardingRequest {
  shopName: string;
  address: string;
  shopMobileNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerMobileNumber: string;
  email: string;
}

export interface CreateShopOnboardingResponse {
  success: boolean;
  shopId: string;
  onboardStep: string;
  message: string;
}

export interface OnboardingShopFeaturesRequest {
  shopId: string;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
}

export interface OnboardingShopFeaturesPayload {
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
}

export interface UpdateShopFeaturesRequest {
  shopId: string;
  sendReceiptSms: boolean;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
  isAdditionalUsersAdded: boolean;
  numAdditionalUsers?: number | null;
  smsPackageType?: string;
}

export interface ShopFeaturesPayload {
  sendReceiptSms: boolean;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
  isAdditionalUsersAdded: boolean;
  numAdditionalUsers: number | null;
  maxUsers?: number;
}

export interface GetShopFeaturesResponse {
  success: boolean;
  shopId: string;
  message: string;
  features: Omit<ShopFeaturesPayload, 'maxUsers'>;
}

export interface UpdateShopFeaturesResponse {
  success: boolean;
  shopId: string;
  onboardStep?: string;
  message: string;
  features: ShopFeaturesPayload | OnboardingShopFeaturesPayload;
}

export interface SendOtpOnboardingRequest {
  shopId: string;
}

export interface SendOtpOnboardingResponse {
  success: boolean;
  message: string;
  shopId: string;
  mobileNumber: string;
  otpTimerSeconds: number;
}

export interface VerifyOtpOnboardingRequest {
  shopId: string;
  otp: string;
}

export interface VerifyOtpOnboardingResponse {
  success: boolean;
  message: string;
  shopId: string;
  isVerifyPhoneNumber: boolean;
  onboardStep: string;
  otpTimerSeconds: number;
}

export interface SignupOnboardingRequest {
  shopId: string;
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
}

export interface SignupOnboardingResponse {
  success: boolean;
  shopId: string;
  message: string;
}

export interface SetSubscriptionRequest {
  shopId: string;
  subscriptionType: string;
}

export interface SetSubscriptionResponse {
  success: boolean;
  shopId: string;
  subscriptionType: string;
  onboardStep: string;
  message: string;
}

export interface RemoveOnboardingDataRequest {
  shopId: string;
}

export interface RemoveOnboardingDataResponse {
  success: boolean;
  shopId: string;
  removedUsers: number;
  message: string;
}
