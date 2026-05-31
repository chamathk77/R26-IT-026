export type ForecastStatus = 'GREEN' | 'YELLOW' | 'RED';

export interface ForecastMarginBands {
  greenMinPercent: number;
  yellowMinPercent: number;
}

export interface ForecastAccuracy {
  holdoutMonths?: number;
  salesMae?: number;
  costMae?: number;
  salesMapePercent?: number;
  costMapePercent?: number;
  note?: string;
}

export interface NextMonthForecast {
  targetMonth: string;
  predictedSales: number;
  predictedCost: number;
  predictedProfit: number;
  marginPercent: number;
  status: ForecastStatus;
  marginBands?: ForecastMarginBands;
  lastHistoryMonth?: string;
  /** Actuals from the latest month in the training CSV (for comparison). */
  lastMonthSales?: number;
  lastMonthCost?: number;
  lastMonthProfit?: number;
  lastMonthMarginPercent?: number;
  /** Hold-out MAE / MAPE from last Python training run (when present in model bundle). */
  accuracy?: ForecastAccuracy | null;
}

export interface NextMonthForecastResponse {
  success: boolean;
  data: NextMonthForecast;
}

export interface MonthlySeriesPoint {
  month: string;
  sales: number;
  cost: number;
}
