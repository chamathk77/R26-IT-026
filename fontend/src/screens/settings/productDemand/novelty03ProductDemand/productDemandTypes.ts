/** Product demand forecasting runs entirely on the Python analysis backend. */
export type PredictionEngine = 'python';

export interface DemandDayPoint {
  day: number;
  predicted: number;
  lower: number;
  upper: number;
}

export type DemandHorizonKey = 'next7Days' | 'next14Days' | 'next30Days';

export interface DemandHorizon {
  label: string;
  days: number;
  totalPredictedUnits: number;
  lowerUnits: number;
  upperUnits: number;
}

export interface ProductDemandResult {
  productId: string | null;
  productName: string;
  method: string;
  daysOfHistory: number;
  dailyPoints: DemandDayPoint[];
  horizons: Record<DemandHorizonKey, DemandHorizon>;
}

export interface ProductDemandDataQuality {
  level: 'insufficient' | 'good';
  message: string;
}

export interface ProductDemandData {
  generatedAt: string;
  lookbackDays: number;
  daysOfHistory: number;
  dataQuality: ProductDemandDataQuality;
  poweredBy?: PredictionEngine;
  results: ProductDemandResult[];
}

export interface GetProductDemandForecastResponse {
  success: boolean;
  shopId: string;
  branchId: string;
  data: ProductDemandData;
  message: string;
}
