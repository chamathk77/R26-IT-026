import type { IndustryType } from './industry';

export type { IndustryType } from './industry';

export type OnboardingOwnerData = {
  shopId?: string;
  industryType: IndustryType;
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

export type OnboardingStep = 1 | 2 | 3 | 4;

export type OnboardingModuleKey =
  | 'kpi'
  | 'analyticsModule'
  | 'customerManualOrder'
  | 'costModule'
  | 'marketingModule';

export type OnboardingModulesState = Record<OnboardingModuleKey, boolean>;

export type SubscriptionType = '1month' | '3months' | '6months' | '1year';

export const DEFAULT_MAX_USERS = 3;
export const ADDITIONAL_USER_MONTHLY_PRICE_LKR = 290;
export const SMS_PRICE_PER_MESSAGE_LKR = 1.15;

export const SUBSCRIPTION_BILLING_MONTHS: Record<SubscriptionType, number> = {
  '1month': 1,
  '3months': 3,
  '6months': 6,
  '1year': 12,
};

export function getSubscriptionBillingMonths(
  subscriptionType?: string | null,
): number {
  if (!subscriptionType) {
    return 1;
  }
  return SUBSCRIPTION_BILLING_MONTHS[subscriptionType as SubscriptionType] ?? 1;
}

export function calculateAdditionalUsersCharge(
  subscriptionType: string | null | undefined,
  numAdditionalUsers: number,
): number {
  const billingMonths = getSubscriptionBillingMonths(subscriptionType);
  return billingMonths * numAdditionalUsers * ADDITIONAL_USER_MONTHLY_PRICE_LKR;
}

export function formatSubscriptionBillingPeriod(
  subscriptionType?: string | null,
): string {
  const months = getSubscriptionBillingMonths(subscriptionType);
  if (months === 1) return 'monthly';
  if (months === 3) return '3-month';
  if (months === 6) return '6-month';
  if (months === 12) return '12-month';
  return `${months}-month`;
}

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
