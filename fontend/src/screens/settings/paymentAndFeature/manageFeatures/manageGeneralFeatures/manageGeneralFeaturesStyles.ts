import { StyleSheet } from 'react-native';
import { manageFeaturesSharedStyles } from '../shared/manageFeaturesSharedStyles';

export const FEATURE_ACCENTS: Record<
  string,
  { iconBg: string; iconColor: string; activeBorder: string }
> = {
  kpi: { iconBg: '#fef3c7', iconColor: '#b45309', activeBorder: '#f59e0b' },
  analyticsModule: { iconBg: '#ccfbf1', iconColor: '#0f766e', activeBorder: '#14b8a6' },
  customerManualOrder: { iconBg: '#ede9fe', iconColor: '#6d28d9', activeBorder: '#8b5cf6' },
  costModule: { iconBg: '#fce7f3', iconColor: '#db2777', activeBorder: '#ec4899' },
  marketingModule: { iconBg: '#ffedd5', iconColor: '#c2410c', activeBorder: '#f97316' },
};

export const manageGeneralFeaturesStyles = {
  ...manageFeaturesSharedStyles,
};
