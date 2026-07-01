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

export interface GetShopModuleFeaturesResponse {
  success: boolean;
  shopId: string;
  message: string;
  features: OnboardingShopFeaturesPayload;
}

export interface UpdateShopModuleFeaturesRequest {
  shopId: string;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
}

export interface UpdateShopModuleFeaturesResponse {
  success: boolean;
  shopId: string;
  message: string;
  features: OnboardingShopFeaturesPayload;
}

export interface ShopUsersFeaturesPayload {
  isAdditionalUsersAdded: boolean;
  numAdditionalUsers: number | null;
  maxUsers: number;
}

export interface GetShopUsersFeaturesResponse {
  success: boolean;
  shopId: string;
  message: string;
  features: ShopUsersFeaturesPayload;
}

export interface UpdateShopUsersFeaturesRequest {
  shopId: string;
  isAdditionalUsersAdded: boolean;
  numAdditionalUsers?: number | null;
}

export interface UpdateShopUsersFeaturesResponse {
  success: boolean;
  shopId: string;
  message: string;
  features: ShopUsersFeaturesPayload;
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

export interface SubscriptionPlan {
  type: string;
  fee: number;
  includedDays: number;
  saveAmount: number;
}

export interface GetSubscriptionPlansResponse {
  success: boolean;
  message: string;
  subscriptions: SubscriptionPlan[];
}

export interface SetSubscriptionPaymentSummary {
  _id: string;
  shopId: string;
  receiptNumber: string;
  paymentAmount: number;
  paymentType: string;
  subscriptionType: string;
  exactPaymentDay: string | null;
  expiryDate: string | null;
  status: string;
  description: string | null;
}

export interface SetSubscriptionResponse {
  success: boolean;
  shopId: string;
  subscriptionType: string;
  onboardStep?: string;
  status?: string;
  subscriptionStartDate?: string;
  nextPaymentDate?: string;
  subscriptionReceiptNo?: string;
  message: string;
  payment?: SetSubscriptionPaymentSummary;
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
