import { KpiPeriodKey } from '../../../type/kpi';

export const KPI_PERIOD_OPTIONS: { key: KpiPeriodKey; label: string }[] = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_3_months', label: 'Last 3 months' },
];

export function getKpiPeriodLabel(period: KpiPeriodKey | null): string {
  return KPI_PERIOD_OPTIONS.find((option) => option.key === period)?.label ?? 'Custom range';
}
