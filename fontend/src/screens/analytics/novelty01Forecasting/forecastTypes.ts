export type ForecastHorizonKey =
  | 'next_month'
  | 'next_3_months'
  | 'next_6_months'
  | 'next_12_months';

export interface ForecastInterval {
  predicted: number;
  lower: number;
  upper: number;
}

export interface ForecastHistoryMonth {
  month: string;
  label: string;
  sales: number;
  costs: number;
  profit: number;
  orderCount: number;
  expenseCount: number;
  partial: boolean;
}

export interface ForecastMonth {
  month: string;
  label: string;
  sales: ForecastInterval;
  costs: ForecastInterval;
  profit: { predicted: number };
}

export interface ForecastHorizon {
  key: ForecastHorizonKey;
  label: string;
  monthCount: number;
  startMonth: string;
  endMonth: string;
  startLabel: string;
  endLabel: string;
  sales: ForecastInterval;
  costs: ForecastInterval;
  profit: { predicted: number; margin: number };
  monthlyAverage: { sales: number; costs: number; profit: number };
}

export interface ForecastAccuracy {
  mape: number | null;
  rmse: number | null;
  mae: number | null;
  sampleSize: number;
}

export interface ForecastBacktest extends ForecastAccuracy {
  holdoutMonths: number;
  method: string;
}

/** Forecasting runs entirely on the Python analysis backend — no JS fallback. */
export type PredictionEngine = 'python';

export interface ForecastModelInfo {
  method: string;
  params: Record<string, number | string>;
  accuracy: ForecastAccuracy | null;
  backtest: ForecastBacktest | null;
  poweredBy?: PredictionEngine;
}

export interface ForecastCurrentMonth {
  month: string;
  label: string;
  actualSoFar: { sales: number; costs: number; profit: number };
  projectedTotal: { sales: number; costs: number; profit: number };
}

export interface ForecastDataQuality {
  monthsOfHistory: number;
  level: 'none' | 'insufficient' | 'limited' | 'good';
  seasonalModelUsed: boolean;
  message: string;
}

export interface SalesCostForecastData {
  generatedAt: string;
  history: {
    months: ForecastHistoryMonth[];
    completeMonths: number;
  };
  currentMonth: ForecastCurrentMonth | null;
  forecast: {
    months: ForecastMonth[];
    horizons: ForecastHorizon[];
  };
  models: {
    sales: ForecastModelInfo;
    costs: ForecastModelInfo;
  } | null;
  dataQuality: ForecastDataQuality;
}

export interface GetSalesCostForecastResponse {
  success: boolean;
  shopId: string;
  branchId: string;
  data: SalesCostForecastData;
  message: string;
}
