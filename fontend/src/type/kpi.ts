import { HistoryRecord } from './history';

export type KpiPeriodKey = 'this_month' | 'last_month' | 'last_3_months';

export type KpiApiPeriodKey = 'current_month' | 'last_month' | 'last_3_months';

export type KpiSummaryFilters =
  | { filterType: 'period'; period: KpiApiPeriodKey }
  | { filterType: 'custom_range'; startDate: string; endDate: string };

export interface KpiSalesPersonSummary {
  salesPersonId: string;
  salePersonId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  workCount: number;
  totalSalesAmount: number;
}

export interface KpiUnassignedOrder {
  orderId: string;
  totalAmount: number;
  checkOutTime: string;
}

export interface KpiUnassignedSales {
  count: number;
  totalSalesAmount: number;
  orders: KpiUnassignedOrder[];
}

export interface KpiSummaryData {
  filters: KpiSummaryFilters;
  rangeStart: string;
  rangeEnd: string;
  totalSales: number;
  orderCount: number;
  salesPersons: KpiSalesPersonSummary[];
  unassignedSales: KpiUnassignedSales;
}

export interface GetKpiSummaryResponse {
  success: boolean;
  data: KpiSummaryData;
  message: string;
}

export type FetchKpiSummaryParams =
  | { period: KpiPeriodKey }
  | { startDate: string; endDate: string };

export type KpiHistoryRecord = HistoryRecord;

export interface GetKpiHistoryByOrderIdResponse {
  success: boolean;
  data: KpiHistoryRecord;
  message: string;
}

export interface AssignKpiHistorySalesPersonParams {
  orderId: string;
  salesPersonId: string;
}

export interface AssignKpiHistorySalesPersonResponse {
  success: boolean;
  data: KpiHistoryRecord;
  message: string;
}
