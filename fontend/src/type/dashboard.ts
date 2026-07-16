export interface TodaySalesStats {
  totalSales: number;
  orderCount: number;
}

export interface BranchSalesSummary extends TodaySalesStats {
  branchId: string;
  branchName: string | null;
  isMainBranch?: boolean;
  isActive?: boolean;
}

export interface BranchLoggedUserDashboardStats extends TodaySalesStats {
  shopId?: string;
  branchId?: string;
}

export interface AllSalesSummaryDashboard {
  totalSales: number;
  orderCount: number;
  branches: BranchSalesSummary[];
}

export interface GetBranchLoggedUserDashboardResponse {
  success: boolean;
  shopId?: string;
  branchId?: string;
  data: TodaySalesStats;
  message?: string;
}

export interface GetAllSalesSummaryDashboardResponse {
  success: boolean;
  shopId?: string;
  data: AllSalesSummaryDashboard;
  message?: string;
}

/** @deprecated kept for older imports — prefer BranchLoggedUserDashboardStats */
export interface TodayHomeStats {
  mine: TodaySalesStats;
  all: TodaySalesStats;
}

export interface GetTodayHomeStatsResponse {
  success: boolean;
  data: TodayHomeStats;
  message: string;
}
