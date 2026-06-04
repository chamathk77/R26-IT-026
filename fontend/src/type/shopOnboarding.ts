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
