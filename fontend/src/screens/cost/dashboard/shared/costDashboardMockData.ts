export type CostPeriodKey =
  | 'current_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_1_year';

export const COST_PERIOD_OPTIONS: { key: CostPeriodKey; label: string }[] = [
  { key: 'current_month', label: 'Current month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_3_months', label: 'Last 3 months' },
  { key: 'last_6_months', label: 'Last 6 months' },
  { key: 'last_1_year', label: 'Last 1 year' },
];

export const COST_TOTALS_BY_PERIOD: Record<CostPeriodKey, number> = {
  current_month: 84250,
  last_month: 79100,
  last_3_months: 238400,
  last_6_months: 462800,
  last_1_year: 918600,
};

export const COST_CATEGORY_BREAKDOWN: Record<
  CostPeriodKey,
  { name: string; amount: number; color: string }[]
> = {
  current_month: [
    { name: 'Rent & utilities', amount: 32000, color: '#6d28d9' },
    { name: 'Inventory', amount: 28500, color: '#0f766e' },
    { name: 'Staff', amount: 15200, color: '#1d4ed8' },
    { name: 'Marketing', amount: 8550, color: '#db2777' },
  ],
  last_month: [
    { name: 'Rent & utilities', amount: 32000, color: '#6d28d9' },
    { name: 'Inventory', amount: 25100, color: '#0f766e' },
    { name: 'Staff', amount: 14800, color: '#1d4ed8' },
    { name: 'Marketing', amount: 7200, color: '#db2777' },
  ],
  last_3_months: [
    { name: 'Rent & utilities', amount: 96000, color: '#6d28d9' },
    { name: 'Inventory', amount: 78200, color: '#0f766e' },
    { name: 'Staff', amount: 44100, color: '#1d4ed8' },
    { name: 'Marketing', amount: 20100, color: '#db2777' },
  ],
  last_6_months: [
    { name: 'Rent & utilities', amount: 192000, color: '#6d28d9' },
    { name: 'Inventory', amount: 148500, color: '#0f766e' },
    { name: 'Staff', amount: 86400, color: '#1d4ed8' },
    { name: 'Marketing', amount: 35900, color: '#db2777' },
  ],
  last_1_year: [
    { name: 'Rent & utilities', amount: 384000, color: '#6d28d9' },
    { name: 'Inventory', amount: 298200, color: '#0f766e' },
    { name: 'Staff', amount: 156800, color: '#1d4ed8' },
    { name: 'Marketing', amount: 79600, color: '#db2777' },
  ],
};

export const COST_SUMMARY_ROWS = [
  { id: '1', category: 'Rent & utilities', period: 'Current month', amount: 32000 },
  { id: '2', category: 'Inventory restock', period: 'Current month', amount: 18500 },
  { id: '3', category: 'Staff salaries', period: 'Last month', amount: 14800 },
  { id: '4', category: 'Social ads', period: 'Last 3 months', amount: 9200 },
];

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

export function getPeriodLabel(key: CostPeriodKey): string {
  return COST_PERIOD_OPTIONS.find((option) => option.key === key)?.label ?? key;
}
