import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  AllSalesSummaryDashboard,
  BranchLoggedUserDashboardStats,
  GetAllSalesSummaryDashboardResponse,
  GetBranchLoggedUserDashboardResponse,
  TodaySalesStats,
} from '../type/dashboard';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function getLocalDayRange(): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function normalizeSalesStats(payload?: Partial<TodaySalesStats> | null): TodaySalesStats {
  return {
    totalSales: Number(payload?.totalSales ?? 0),
    orderCount: Number(payload?.orderCount ?? 0),
  };
}

/** Today sales/orders for logged-in user on current branch. */
export async function fetchBranchLoggedUserDashboard_Service(): Promise<BranchLoggedUserDashboardStats> {
  try {
    await ensureInternetConnection();

    const { from, to } = getLocalDayRange();
    const response = await apiClient.get<GetBranchLoggedUserDashboardResponse>(
      '/api/history/stats/dashboard/branch-logged-user',
      { params: { from, to } },
    );

    if (isHttpSuccess(response.status) && response.data?.success) {
      const stats = normalizeSalesStats(response.data.data);
      return {
        ...stats,
        shopId: response.data.shopId,
        branchId: response.data.branchId,
      };
    }

    const apiError: ApiErrorResponse = {
      error: 'Error',
      message: 'Could not load your today sales stats',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
    throw apiError;
  } catch (error: unknown) {
    throw toApiErrorResponse(error);
  }
}

/** Owner only: shop-wide totals + per-branch breakdown. */
export async function fetchAllSalesSummaryDashboard_Service(): Promise<AllSalesSummaryDashboard> {
  try {
    await ensureInternetConnection();

    const { from, to } = getLocalDayRange();
    const response = await apiClient.get<GetAllSalesSummaryDashboardResponse>(
      '/api/history/stats/dashboard/all-sales-summary',
      { params: { from, to } },
    );

    if (isHttpSuccess(response.status) && response.data?.success) {
      const data = response.data.data;
      return {
        totalSales: Number(data?.totalSales ?? 0),
        orderCount: Number(data?.orderCount ?? 0),
        branches: Array.isArray(data?.branches)
          ? data.branches.map((branch) => ({
              branchId: String(branch.branchId ?? ''),
              branchName: branch.branchName ?? null,
              isMainBranch: Boolean(branch.isMainBranch),
              isActive: Boolean(branch.isActive),
              totalSales: Number(branch.totalSales ?? 0),
              orderCount: Number(branch.orderCount ?? 0),
            }))
          : [],
      };
    }

    const apiError: ApiErrorResponse = {
      error: 'Error',
      message: 'Could not load all-branches sales summary',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
    throw apiError;
  } catch (error: unknown) {
    throw toApiErrorResponse(error);
  }
}
