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
  | 'sendReceiptSms'
  | 'kpi'
  | 'analyticsModule'
  | 'marketingModule'
  | 'customerManualOrder'
  | 'costModule';

export type ShopFeaturesState = Record<ShopFeatureKey, boolean>;

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export type SubscriptionType = '1month' | '3months' | '6months' | '1year';

export const DEFAULT_MAX_USERS = 3;
export const ADDITIONAL_USER_MONTHLY_PRICE_LKR = 499;
export const SMS_PRICE_PER_MESSAGE_LKR = 1.4;

export function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}

/** e.g. 1.4 → "1.4 LKR" */
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
