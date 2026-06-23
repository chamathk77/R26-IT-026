import { OnboardingStep, ShopFeatureKey, ShopFeaturesState } from '../../../type/onboarding';

export const ONBOARDING_STEPS: { step: OnboardingStep; label: string }[] = [
  { step: 1, label: 'Shop & Owner' },
  { step: 2, label: 'Features' },
  { step: 3, label: 'Password' },
  { step: 4, label: 'OTP Verification' },
];

export type FeatureOption = {
  key: ShopFeatureKey;
  title: string;
  description: string;
  icon: string;
};

export const FEATURE_OPTIONS: FeatureOption[] = [
  {
    key: 'sendReceiptSms',
    title: 'Send Digital Receipt SMS',
    description:
      'Automatically send digital receipt links to customers by SMS after checkout. Every SMS is billed monthly with your subscription at 1.4 LKR per message.',
    icon: 'chatbubble-ellipses-outline',
  },
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
