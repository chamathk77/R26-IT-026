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

export interface UpdateShopFeaturesRequest {
  shopId: string;
  manageInventory: boolean;
  sms: boolean;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
  isAdditionalUsersAdded: boolean;
  numAdditionalUsers?: number | null;
}

export interface ShopFeaturesPayload {
  manageInventory: boolean;
  sms: boolean;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
  isAdditionalUsersAdded: boolean;
  numAdditionalUsers: number | null;
  maxUsers: number;
}

export interface UpdateShopFeaturesResponse {
  success: boolean;
  shopId: string;
  onboardStep: string;
  message: string;
  features: ShopFeaturesPayload;
}
