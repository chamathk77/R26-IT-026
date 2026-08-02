import {
  OnboardingStep,
  OnboardingModuleKey,
  OnboardingModulesState,
  ShopFeatureKey,
  ShopFeaturesState,
  SubscriptionType,
} from '../../../../type/onboarding';

export const ONBOARDING_STEPS: { step: OnboardingStep; label: string }[] = [
  { step: 1, label: 'Shop & Owner' },
  { step: 2, label: 'OTP Verification' },
  { step: 3, label: 'Password' },
  { step: 4, label: 'Features' },
];

export type SubscriptionOption = {
  id: SubscriptionType;
  title: string;
  icon: string;
  totalPrice: number;
  perMonthPrice?: number;
  savings?: number;
  validityLabel: string;
  isBestValue?: boolean;
};

export function formatSubscriptionRs(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

export const SUBSCRIPTION_OPTIONS: SubscriptionOption[] = [
  {
    id: '1month',
    title: 'Monthly Plan',
    icon: 'calendar-outline',
    totalPrice: 3900,
    validityLabel: 'Valid for 30 days',
  },
  {
    id: '3months',
    title: 'Quarterly Plan',
    icon: 'albums-outline',
    totalPrice: 10800,
    perMonthPrice: 3600,
    savings: 900,
    validityLabel: 'Valid for 3 months',
  },
  {
    id: '6months',
    title: 'Half-Year Plan',
    icon: 'time-outline',
    totalPrice: 21000,
    perMonthPrice: 3500,
    savings: 2400,
    validityLabel: 'Valid for 6 months',
  },
  {
    id: '1year',
    title: 'Annual Plan',
    icon: 'ribbon-outline',
    totalPrice: 40800,
    perMonthPrice: 3400,
    savings: 6000,
    validityLabel: 'Valid for 12 months',
    isBestValue: true,
  },
];

export type FeatureOption = {
  key: ShopFeatureKey;
  title: string;
  description: string;
  icon: string;
};

export type OnboardingModuleOption = {
  key: OnboardingModuleKey;
  title: string;
  description: string;
  icon: string;
};

export const ONBOARDING_MODULE_OPTIONS: OnboardingModuleOption[] = [
  {
    key: 'kpi',
    title: 'KPI (Key Performance Indicators)',
    description: 'Monitor sales targets, growth metrics, and team performance at a glance.',
    icon: 'stats-chart-outline',
  },
  {
    key: 'analyticsModule',
    title: 'Analytics Module',
    description: 'Visualize trends, revenue patterns, and business insights with dashboards.',
    icon: 'analytics-outline',
  },
  {
    key: 'customerManualOrder',
    title: 'Customer Manual Order',
    description:
      'Customers can use the front desk app to browse the menu and place their own orders at your shop.',
    icon: 'receipt-outline',
  },
  {
    key: 'costModule',
    title: 'Cost Module',
    description: 'Control expenses, margins, and cost analysis across your operations.',
    icon: 'wallet-outline',
  },
  {
    key: 'marketingModule',
    title: 'Marketing Option',
    description: 'Run promotions and marketing campaigns tied to customer contact numbers.',
    icon: 'megaphone-outline',
  },
];

export const FEATURE_OPTIONS: FeatureOption[] = [
  {
    key: 'sendReceiptSms',
    title: 'Send Digital Receipt SMS',
    description: 'Automatically send digital receipt links to customers by SMS after checkout.',
    icon: 'chatbubble-ellipses-outline',
  },
  ...ONBOARDING_MODULE_OPTIONS,
];

const DEFAULT_ENABLED_ONBOARDING_MODULES: ReadonlySet<OnboardingModuleKey> = new Set([
  'kpi',
  'analyticsModule',
  'costModule',
  'marketingModule',
]);

export function createDefaultOnboardingModules(): OnboardingModulesState {
  return ONBOARDING_MODULE_OPTIONS.reduce(
    (acc, item) => {
      acc[item.key] = DEFAULT_ENABLED_ONBOARDING_MODULES.has(item.key);
      return acc;
    },
    {} as OnboardingModulesState,
  );
}

const DEFAULT_ENABLED_FEATURES: ReadonlySet<ShopFeatureKey> = new Set([
  'kpi',
  'analyticsModule',
  'costModule',
  'marketingModule',
]);

export function createDefaultFeatures(): ShopFeaturesState {
  return FEATURE_OPTIONS.reduce(
    (acc, item) => {
      acc[item.key] = DEFAULT_ENABLED_FEATURES.has(item.key);
      return acc;
    },
    {} as ShopFeaturesState,
  );
}
