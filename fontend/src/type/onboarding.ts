export type OnboardingOwnerData = {
  shopId?: string;
  shopName: string;
  address: string;
  shopMobileNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
  email: string;
  ownerMobileNumber: string;
};

export type ShopFeatureKey =
  | 'manageInventory'
  | 'sms'
  | 'kpi'
  | 'analyticsModule'
  | 'marketingModule'
  | 'customerManualOrder'
  | 'costModule';

export type ShopFeaturesState = Record<ShopFeatureKey, boolean>;

export type OnboardingStep = 1 | 2 | 3 | 4;

export const DEFAULT_MAX_USERS = 3;
export const ADDITIONAL_USER_MONTHLY_PRICE_LKR = 499;
export const SMS_PRICE_PER_MESSAGE_LKR = 0.8;

export function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}

/** e.g. 0.8 → "0.8 LKR" */
export function formatLkrDecimal(amount: number, fractionDigits = 1): string {
  return `${amount.toLocaleString('en-LK', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })} LKR`;
}

export type OnboardingUserConfig = {
  maxUsers: number;
  isAdditionalUsersAdded: boolean;
  numAdditionalUsers: number | null;
};
