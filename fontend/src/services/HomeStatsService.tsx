import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { GetTodayHomeStatsResponse, TodayHomeStats } from '../type/dashboard';

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

function normalizeTodayHomeStats(payload: GetTodayHomeStatsResponse | undefined): TodayHomeStats {
  const mine = payload?.data?.mine;
  const all = payload?.data?.all;

  return {
    mine: {
      totalSales: Number(mine?.totalSales ?? 0),
      orderCount: Number(mine?.orderCount ?? 0),
    },
    all: {
      totalSales: Number(all?.totalSales ?? 0),
      orderCount: Number(all?.orderCount ?? 0),
    },
  };
}

export async function fetchTodayHomeStats_Service(): Promise<TodayHomeStats> {
  try {
    await ensureInternetConnection();

    const { from, to } = getLocalDayRange();
    const response = await apiClient.get<GetTodayHomeStatsResponse>('/api/history/stats/today', {
      params: { from, to },
    });

    if (isHttpSuccess(response.status)) {
      return normalizeTodayHomeStats(response.data);
    }

    const apiError: ApiErrorResponse = {
      error: 'Error',
      message: 'Could not load today sales stats',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
    throw apiError;
  } catch (error: any) {
    if (error.error && error.message && error.status && error.timestamp) {
      throw error as ApiErrorResponse;
    }

    const networkError: ApiErrorResponse = {
      error: 'Network Error',
      message:
        error.message || 'Network error. Please check your connection and try again.',
      status: 0,
      timestamp: new Date().toISOString(),
    };
    throw networkError;
  }
}
