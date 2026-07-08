export interface OnboardUserSummary {
  shopId: string;
  oneTimePaymentAmount: number | null;
  isOneTimePaymentGenerated: boolean;
  isOneTimePaymentDone: boolean;
}

export interface OnboardUsersResponse {
  success: boolean;
  count: number;
  shops: OnboardUserSummary[];
}

export interface OnboardingShopDetails {
  shopName: string;
  address: string;
  shopMobileNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerMobileNumber: string;
  email: string | null;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
  oneTimePaymentAmount: number | null;
  isOneTimePaymentDone: boolean;
  isOneTimePaymentGenerated: boolean;
  oneTimePaymentReceiptNo: string | null;
  shopId: string;
}

export interface OnboardingShopDetailsResponse {
  success: boolean;
  shop: OnboardingShopDetails;
}

export interface UpdateOnboardingShopPayload {
  shopName?: string;
  address?: string;
  shopMobileNumber?: string;
  email?: string | null;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerMobileNumber?: string;
  oneTimePaymentAmount?: number | null;
  kpi?: boolean;
  analyticsModule?: boolean;
  customerManualOrder?: boolean;
  costModule?: boolean;
  marketingModule?: boolean;
}

export interface UpdateOnboardingShopResponse {
  success: boolean;
  message: string;
  shop: OnboardingShopDetails;
}
