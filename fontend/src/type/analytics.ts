export type AnalyticsPeriodKey =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_year';

export type AnalyticsApiPeriodKey =
  | 'current_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_1_year';

export type AnalyticsFilters =
  | { filterType: 'period'; period: AnalyticsApiPeriodKey }
  | { filterType: 'custom_range'; startDate: string; endDate: string };

export interface AnalyticsMetricTotals {
  totalAmount: number;
  recordCount: number;
}

export interface AnalyticsProfitMetrics {
  amount: number;
  margin: number;
}

export interface AnalyticsOverviewData {
  filters: AnalyticsFilters;
  rangeStart: string;
  rangeEnd: string;
  costs: AnalyticsMetricTotals;
  sales: AnalyticsMetricTotals;
  profit: AnalyticsProfitMetrics;
}

export interface GetAnalyticsOverviewResponse {
  success: boolean;
  data: AnalyticsOverviewData;
  message: string;
}

export type FetchAnalyticsOverviewParams =
  | { period: AnalyticsPeriodKey }
  | { startDate: string; endDate: string };
