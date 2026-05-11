export interface TodaySalesStats {
  totalSales: number;
  orderCount: number;
}

export interface TodayHomeStats {
  mine: TodaySalesStats;
  all: TodaySalesStats;
}

export interface GetTodayHomeStatsResponse {
  success: boolean;
  data: TodayHomeStats;
  message: string;
}
