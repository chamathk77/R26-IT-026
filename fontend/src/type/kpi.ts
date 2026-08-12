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
  cartNumber?: number;
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

export interface KpiHistorySummaryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface KpiHistorySummaryFilters {
  salesPersonId: string;
  startDate: string;
  endDate: string;
  salesPersonName: string;
  salePersonId: string | null;
  position: string;
}

export interface KpiHistorySummaryStats {
  orderCount: number;
  totalSalesAmount: number;
}

export interface FetchKpiHistorySummaryParams {
  salesPersonId: string;
  startDate: string;
  endDate: string;
  page?: number;
  limit?: number;
  append?: boolean;
}

export interface GetKpiHistorySummaryResponse {
  success: boolean;
  count?: number;
  total?: number;
  filters?: KpiHistorySummaryFilters;
  summary?: KpiHistorySummaryStats;
  pagination?: KpiHistorySummaryPagination;
  data?: KpiHistoryRecord[];
  message?: string;
}
