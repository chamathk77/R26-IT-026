export interface BehaviorDataQuality {
  level: 'none' | 'insufficient' | 'limited' | 'good';
  ordersAnalyzed: number;
  daysOfHistory: number;
  lookbackDays: number;
  message: string;
}

export interface HourBucket {
  hour: number;
  label: string;
  totalSales: number;
  orderCount: number;
  avgSales: number;
}

export interface PeakHour extends HourBucket {
  upliftPercent: number;
}

export interface HourlyPattern {
  hours: HourBucket[];
  peakHour: PeakHour | null;
}

export interface DayBucket {
  day: number;
  label: string;
  totalSales: number;
  orderCount: number;
  avgSales: number;
}

export interface WeekendVsWeekday {
  weekdayAvg: number;
  weekendAvg: number;
  higher: 'weekend' | 'weekday';
  diffPercent: number;
}

export interface DailyPattern {
  days: DayBucket[];
  peakDay: DayBucket | null;
  weekendVsWeekday: WeekendVsWeekday | null;
}

export interface ProductRankingEntry {
  productId: string | null;
  productName: string;
  qtySold: number;
  orderCount: number;
  estimatedRevenue: number;
}

export interface ProductRankings {
  rankingReady: boolean;
  productsTracked: number;
  topProducts: ProductRankingEntry[];
  slowProducts: ProductRankingEntry[];
}

export interface SalesTrend {
  direction: 'increasing' | 'decreasing' | 'stable' | 'unknown';
  monthlyChangePercent: number;
  monthsAnalyzed: number;
  method?: string;
}

export interface CustomerSegment {
  key: string;
  label: string;
  size: number;
  sharePercent: number;
  revenueSharePercent: number;
  avgRecencyDays: number;
  avgFrequency: number;
  avgMonetary: number;
}

/** Customer segmentation runs entirely on the Python analysis backend — no JS fallback. */
export type PredictionEngine = 'python';

export interface CustomerSegments {
  segmentationReady: boolean;
  method?: string;
  customersAnalyzed: number;
  minimumRequired?: number;
  segments: CustomerSegment[];
  poweredBy?: PredictionEngine;
}

export type BehaviorInsightType =
  | 'peak_hour'
  | 'weekend_weekday'
  | 'top_product'
  | 'slow_product'
  | 'trend'
  | 'segment_top'
  | 'segment_lapsed'
  | 'identified_share';

export type BehaviorInsightTone = 'positive' | 'negative' | 'warning' | 'info' | 'neutral';

export interface BehaviorInsight {
  type: BehaviorInsightType;
  tone: BehaviorInsightTone;
  text: string;
}

export interface CustomerBehaviorData {
  generatedAt: string;
  lookbackDays: number;
  dataQuality: BehaviorDataQuality;
  hourlyPattern: HourlyPattern | null;
  dailyPattern: DailyPattern | null;
  productRankings: ProductRankings | null;
  salesTrend: SalesTrend | null;
  customerSegments: CustomerSegments | null;
  identifiedOrderSharePercent?: number;
  insights: BehaviorInsight[];
}

export interface GetCustomerBehaviorInsightsResponse {
  success: boolean;
  shopId: string;
  branchId: string;
  data: CustomerBehaviorData;
  message: string;
}
