export type { KpiPeriodKey } from '../../type/kpi';
export { KPI_PERIOD_OPTIONS, getKpiPeriodLabel } from './kpiPeriodOptions';

export type KpiMockSalePerson = {
  _id: string;
  salePersonId: string;
  firstName: string;
  lastName: string;
  position: string;
};

export const MOCK_KPI_SALE_PERSONS: KpiMockSalePerson[] = [
  {
    _id: 'mock-sp-1',
    salePersonId: 'SP001',
    firstName: 'Nimal',
    lastName: 'Fernando',
    position: 'Sales Associate',
  },
  {
    _id: 'mock-sp-2',
    salePersonId: 'SP002',
    firstName: 'Ayesh',
    lastName: 'Silva',
    position: 'Senior Sales',
  },
  {
    _id: 'mock-sp-3',
    salePersonId: 'SP003',
    firstName: 'Dilani',
    lastName: 'Jayawardena',
    position: 'Floor Manager',
  },
];

export function getKpiSalePersonName(
  person: Pick<KpiMockSalePerson, 'firstName' | 'lastName'>,
): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export const MOCK_KPI_SUMMARY = {
  totalSales: 248500,
  orderCount: 42,
  averageOrderValue: 5916.67,
  itemsSold: 186,
  topPaymentMethod: 'Cash',
};

export type MockKpiHistoryRow = {
  id: string;
  orderId: string;
  date: string;
  customerName: string;
  amount: number;
  paymentOption: string;
};

export const MOCK_KPI_HISTORY_ROWS: MockKpiHistoryRow[] = [
  {
    id: '1',
    orderId: 'ORD-1042',
    date: '2026-06-17',
    customerName: 'Kamal Perera',
    amount: 12500,
    paymentOption: 'Cash',
  },
  {
    id: '2',
    orderId: 'ORD-1038',
    date: '2026-06-16',
    customerName: 'Walk-in',
    amount: 4200,
    paymentOption: 'Card',
  },
  {
    id: '3',
    orderId: 'ORD-1031',
    date: '2026-06-14',
    customerName: 'Sanjeewa',
    amount: 8900,
    paymentOption: 'Online',
  },
];

export function formatKpiAmount(value: number): string {
  return `Rs. ${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
