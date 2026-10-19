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
  activeDays?: number;
  partial: boolean;
}

/** Profit range with the chance the month (or total) ends in a loss (0-1). */
export interface ForecastProfitRange {
  predicted: number;
  lower: number;
  upper: number;
  lossProbability: number;
}

export interface ForecastMonth {
  month: string;
  label: string;
  sales: ForecastInterval;
  costs: ForecastInterval;
  profit: ForecastProfitRange;
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
  profit: ForecastProfitRange & { margin: number };
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

export interface ForecastModelSelection {
  /** 'backtest': candidates were compared on past months; 'default': too little history to compare. */
  strategy: 'backtest' | 'default';
  defaultMethod: string;
  folds: number;
  candidates: { method: string; mae: number }[];
}

export interface ForecastModelInfo {
  method: string;
  params: Record<string, number | string>;
  accuracy: ForecastAccuracy | null;
  backtest: ForecastBacktest | null;
  selection: ForecastModelSelection | null;
  /** True when the series was adjusted for the number of strong weekdays in each month. */
  calendarAdjusted: boolean;
  /** 'empirical': ranges from past forecast errors; 'residual': from model fit only. */
  intervalMethod: 'empirical' | 'residual' | null;
  poweredBy?: PredictionEngine;
}

export interface ForecastPacing {
  status: 'ahead' | 'on_track' | 'behind' | 'too_early';
  daysElapsed: number;
  daysInMonth: number;
  salesSoFar?: number;
  expectedSoFar?: number;
  expectedShare?: number;
  ratio?: number | null;
}

export type ForecastBreakEven =
  | {
      available: true;
      months: number;
      fixedCosts: number;
      variableCostRate: number;
      contributionMargin: number;
      breakEvenSales: number;
      r2: number;
      nextMonthSales: number | null;
    }
  | { available: false; reason: string; months: number };

export interface ForecastInsight {
  key: string;
  tone: 'positive' | 'negative' | 'neutral' | 'warning';
  text: string;
}

export interface ForecastEstimatedMonth {
  month: string;
  label: string;
  recorded: { sales: number; costs: number } | null;
  estimated: { sales: number; costs: number };
}

export interface ForecastDataIssue {
  month: string;
  label: string;
  series: 'sales' | 'costs';
  reason: 'few_orders' | 'few_sales_days' | 'no_expenses' | 'few_expenses';
}

export interface ForecastCurrentMonth {
  month: string;
  label: string;
  actualSoFar: { sales: number; costs: number; profit: number };
  projectedTotal: { sales: number; costs: number; profit: number };
  pacing: ForecastPacing | null;
}

export interface ForecastDataQuality {
  monthsOfHistory: number;
  level: 'none' | 'insufficient' | 'limited' | 'good';
  seasonalModelUsed: boolean;
  message: string;
  issues: ForecastDataIssue[];
  excludedMonths: { month: string; label: string }[];
  imputedMonths: { month: string; label: string; series: 'sales' | 'costs' }[];
}

export interface SalesCostForecastData {
  generatedAt: string;
  history: {
    months: ForecastHistoryMonth[];
    completeMonths: number;
  };
  currentMonth: ForecastCurrentMonth | null;
  /** Recent months left out as incompletely recorded, with the model's estimate. */
  estimatedMonths: ForecastEstimatedMonth[];
  forecast: {
    months: ForecastMonth[];
    horizons: ForecastHorizon[];
  };
  models: {
    sales: ForecastModelInfo;
    costs: ForecastModelInfo;
    profitErrorCorrelation: number;
  } | null;
  breakEven: ForecastBreakEven | null;
  calendar: { weekdayWeights: number[] | null };
  insights: ForecastInsight[];
  dataQuality: ForecastDataQuality;
}

export interface GetSalesCostForecastResponse {
  success: boolean;
  shopId: string;
  branchId: string;
  data: SalesCostForecastData;
  message: string;
}
