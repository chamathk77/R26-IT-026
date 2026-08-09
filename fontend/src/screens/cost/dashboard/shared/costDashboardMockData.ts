export type CostPeriodKey =
  | 'current_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_1_year';

export type CurrentMonthCategory = {
  id: string;
  name: string;
  amount: number;
  expenseCount: number;
  color: string;
};

/** Dashboard tab — current month only */
export const CURRENT_MONTH_CATEGORIES: CurrentMonthCategory[] = [
  { id: '1', name: 'Rent & utilities', amount: 32000, expenseCount: 3, color: '#6d28d9' },
  { id: '2', name: 'Inventory', amount: 28500, expenseCount: 5, color: '#0f766e' },
  { id: '3', name: 'Staff', amount: 15200, expenseCount: 2, color: '#1d4ed8' },
  { id: '4', name: 'Marketing', amount: 8550, expenseCount: 2, color: '#db2777' },
];

export const CURRENT_MONTH_EXPENSE_COUNT = CURRENT_MONTH_CATEGORIES.reduce(
  (sum, category) => sum + category.expenseCount,
  0,
);

export const CURRENT_MONTH_CATEGORY_COUNT = CURRENT_MONTH_CATEGORIES.length;

export const CURRENT_MONTH_TOTAL = CURRENT_MONTH_CATEGORIES.reduce(
  (sum, category) => sum + category.amount,
  0,
);

/** Summary tab — period presets */
export const SUMMARY_PERIOD_OPTIONS: { key: CostPeriodKey; label: string }[] = [
  { key: 'current_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_3_months', label: 'Last 3 months' },
  { key: 'last_6_months', label: 'Last 6 months' },
  { key: 'last_1_year', label: 'Last 1 year' },
];

export const COST_TOTALS_BY_PERIOD: Record<CostPeriodKey, number> = {
  current_month: CURRENT_MONTH_TOTAL,
  last_month: 79100,
  last_3_months: 238400,
  last_6_months: 462800,
  last_1_year: 918600,
};

export type SummaryCategoryRow = {
  id: string;
  name: string;
  amount: number;
  expenseCount: number;
  color: string;
};

/** Summary tab — category breakdown per period */
export const COST_CATEGORY_BY_PERIOD: Record<CostPeriodKey, SummaryCategoryRow[]> = {
  current_month: CURRENT_MONTH_CATEGORIES.map(({ id, name, amount, expenseCount, color }) => ({
    id,
    name,
    amount,
    expenseCount,
    color,
  })),
  last_month: [
    { id: '1', name: 'Rent & utilities', amount: 32000, expenseCount: 3, color: '#6d28d9' },
    { id: '2', name: 'Inventory', amount: 25100, expenseCount: 4, color: '#0f766e' },
    { id: '3', name: 'Staff', amount: 14800, expenseCount: 2, color: '#1d4ed8' },
    { id: '4', name: 'Marketing', amount: 7200, expenseCount: 1, color: '#db2777' },
  ],
  last_3_months: [
    { id: '1', name: 'Rent & utilities', amount: 96000, expenseCount: 9, color: '#6d28d9' },
    { id: '2', name: 'Inventory', amount: 78200, expenseCount: 14, color: '#0f766e' },
    { id: '3', name: 'Staff', amount: 44100, expenseCount: 6, color: '#1d4ed8' },
    { id: '4', name: 'Marketing', amount: 20100, expenseCount: 5, color: '#db2777' },
  ],
  last_6_months: [
    { id: '1', name: 'Rent & utilities', amount: 192000, expenseCount: 18, color: '#6d28d9' },
    { id: '2', name: 'Inventory', amount: 148500, expenseCount: 26, color: '#0f766e' },
    { id: '3', name: 'Staff', amount: 86400, expenseCount: 12, color: '#1d4ed8' },
    { id: '4', name: 'Marketing', amount: 35900, expenseCount: 9, color: '#db2777' },
  ],
  last_1_year: [
    { id: '1', name: 'Rent & utilities', amount: 384000, expenseCount: 36, color: '#6d28d9' },
    { id: '2', name: 'Inventory', amount: 298200, expenseCount: 52, color: '#0f766e' },
    { id: '3', name: 'Staff', amount: 156800, expenseCount: 24, color: '#1d4ed8' },
    { id: '4', name: 'Marketing', amount: 79600, expenseCount: 18, color: '#db2777' },
  ],
};

/** Mock category breakdown for custom date range (UI placeholder) */
export const CUSTOM_RANGE_CATEGORY_BREAKDOWN: SummaryCategoryRow[] = [
  { id: '1', name: 'Rent & utilities', amount: 42000, expenseCount: 4, color: '#6d28d9' },
  { id: '2', name: 'Inventory', amount: 53800, expenseCount: 7, color: '#0f766e' },
  { id: '3', name: 'Staff', amount: 38950, expenseCount: 3, color: '#1d4ed8' },
  { id: '4', name: 'Marketing', amount: 22000, expenseCount: 2, color: '#db2777' },
];

export function getSummaryCategoryBreakdown(
  selectedPeriod: CostPeriodKey | null,
  isCustomRange: boolean,
): SummaryCategoryRow[] {
  if (isCustomRange) {
    return CUSTOM_RANGE_CATEGORY_BREAKDOWN;
  }
  const period = selectedPeriod ?? 'current_month';
  return COST_CATEGORY_BY_PERIOD[period];
}

/** Mock total when a custom date range is selected (UI placeholder) */
export const CUSTOM_RANGE_MOCK_TOTAL = CUSTOM_RANGE_CATEGORY_BREAKDOWN.reduce(
  (sum, row) => sum + row.amount,
  0,
);

export const COST_HISTORY_ROWS = [
  {
    id: '1',
    title: 'Electricity bill',
    category: 'Rent & utilities',
    date: '18 Jun 2026',
    amount: 12400,
  },
  {
    id: '2',
    title: 'Supplier payment',
    category: 'Inventory',
    date: '15 Jun 2026',
    amount: 28600,
  },
  {
    id: '3',
    title: 'Staff advance',
    category: 'Staff',
    date: '10 Jun 2026',
    amount: 8000,
  },
  {
    id: '4',
    title: 'Facebook campaign',
    category: 'Marketing',
    date: '5 Jun 2026',
    amount: 4500,
  },
];

export function formatCostAmount(value: number): string {
  return `Rs. ${value.toLocaleString('en-LK')}`;
}

export function getSummaryPeriodLabel(key: CostPeriodKey): string {
  return SUMMARY_PERIOD_OPTIONS.find((option) => option.key === key)?.label ?? key;
}
