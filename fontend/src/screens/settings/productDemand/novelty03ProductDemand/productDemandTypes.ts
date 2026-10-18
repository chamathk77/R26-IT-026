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

/* ── Feature 1: Stockout Risk ── */
export type StockStatusLevel = 'stockout_risk' | 'sufficient' | 'overstock';

export interface StockStatus {
  currentStock: number;
  status: StockStatusLevel;
  label: string;
  suggestedReorder: number;
  daysOfStockLeft: number;
}

/* ── Feature 2: Demand Trend ── */
export type DemandTrendLevel = 'surging' | 'steady' | 'declining';

export interface DemandTrend {
  trend: DemandTrendLevel;
  percentChange: number;
  last7DaySales: number;
  next7DayForecast: number;
}

/* ── Feature 3: Revenue Projection ── */
export interface HorizonRevenueProjection {
  expectedRevenue: number;
  expectedCost: number;
  grossProfit: number;
  marginPercent: number;
}

/* ── Feature 4: Peak Day ── */
export interface PeakDay {
  dayName: string;
  dayIndex: number;
  predictedUnits: number;
}

/* ── Feature 5: Summary (for Restock Checklist) ── */
export interface DemandSummaryRevenue {
  expectedRevenue: number;
  grossProfit: number;
}

export interface DemandSummary {
  totalProducts: number;
  restockNeededCount: number;
  revenue: Record<DemandHorizonKey, DemandSummaryRevenue>;
}

/* ── Main result per product ── */
export interface ProductDemandResult {
  productId: string | null;
  productName: string;
  method: string;
  daysOfHistory: number;
  dailyPoints: DemandDayPoint[];
  horizons: Record<DemandHorizonKey, DemandHorizon>;
  // Enriched fields
  stockStatus: StockStatus;
  demandTrend: DemandTrend;
  revenueProjection: Record<DemandHorizonKey, HorizonRevenueProjection>;
  peakDay: PeakDay | null;
  sellingPrice: number;
  unitCost: number;
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
  summary: DemandSummary | null;
}

export interface GetProductDemandForecastResponse {
  success: boolean;
  shopId: string;
  branchId: string;
  data: ProductDemandData;
  message: string;
}
