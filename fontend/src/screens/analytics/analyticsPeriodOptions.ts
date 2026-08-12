import { AnalyticsPeriodKey } from '../../type/analytics';

export const ANALYTICS_PERIOD_OPTIONS: { key: AnalyticsPeriodKey; label: string }[] = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_3_months', label: 'Last 3 months' },
  { key: 'last_6_months', label: 'Last 6 months' },
  { key: 'last_year', label: 'Last year' },
];

export function getAnalyticsPeriodLabel(period: AnalyticsPeriodKey | null): string {
  return ANALYTICS_PERIOD_OPTIONS.find((option) => option.key === period)?.label ?? 'Custom range';
}
