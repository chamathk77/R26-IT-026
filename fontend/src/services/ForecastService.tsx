import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { NextMonthForecast, NextMonthForecastResponse, MonthlySeriesPoint } from '../type/forecast';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function normalizeMonthlyRows(rawList: unknown): MonthlySeriesPoint[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((row): MonthlySeriesPoint | null => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const month = r.month != null ? String(r.month).trim() : '';
      const sales = Number(r.sales);
      const cost = Number(r.cost);
      if (!month || Number.isNaN(sales) || Number.isNaN(cost)) return null;
      return { month, sales, cost };
    })
    .filter((x): x is MonthlySeriesPoint => x != null);
}

function extractMonthlySeriesRows(responseData: unknown): MonthlySeriesPoint[] | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const body = responseData as { success?: boolean; data?: unknown };
  if (body.success !== true) return null;

  const d = body.data;
  if (Array.isArray(d)) {
    return normalizeMonthlyRows(d);
  }
  if (d && typeof d === 'object') {
    const mid = d as { data?: unknown };
    if (Array.isArray(mid.data)) {
      return normalizeMonthlyRows(mid.data);
    }
  }
  return null;
}

export async function fetchNextMonthForecast_Service(): Promise<NextMonthForecast> {
  try {
    await ensureInternetConnection();

    const response = await apiClient.get<NextMonthForecastResponse>('/api/forecast/next-month');

    if (isHttpSuccess(response.status) && response.data?.success && response.data?.data) {
      return response.data.data;
    }

    const apiError: ApiErrorResponse = {
      error: 'Error',
      message: 'Could not load forecast',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
    throw apiError;
  } catch (error: any) {
    if (error.error && error.message && error.status && error.timestamp) {
      throw error as ApiErrorResponse;
    }

    const msg =
      typeof error?.message === 'string' && error.message.trim()
        ? error.message
        : 'Network error. Please check your connection and try again.';

    const networkError: ApiErrorResponse = {
      error: 'Network Error',
      message: msg,
      status: 0,
      timestamp: new Date().toISOString(),
    };
    throw networkError;
  }
}

export async function fetchMonthlySeries_Service(limit: number = 1): Promise<MonthlySeriesPoint[]> {
  try {
    await ensureInternetConnection();

    const response = await apiClient.get('/api/forecast/series', {
      params: { limit },
    });

    if (!isHttpSuccess(response.status)) {
      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load monthly performance data',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    }

    const rows = extractMonthlySeriesRows(response.data);
    if (rows === null) {
      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not parse monthly performance response',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    }

    return rows;
  } catch (error: any) {
    if (error.error && error.message && error.status && error.timestamp) {
      throw error as ApiErrorResponse;
    }

    const msg =
      typeof error?.message === 'string' && error.message.trim()
        ? error.message
        : 'Network error. Please check your connection and try again.';

    const networkError: ApiErrorResponse = {
      error: 'Network Error',
      message: msg,
      status: 0,
      timestamp: new Date().toISOString(),
    };
    throw networkError;
  }
}
