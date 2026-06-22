import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { KpiPeriodKey } from '../type/kpi';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  AssignKpiHistorySalesPersonParams,
  AssignKpiHistorySalesPersonResponse,
  FetchKpiSummaryParams,
  GetKpiHistoryByOrderIdResponse,
  GetKpiSummaryResponse,
} from '../type/kpi';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function mapPeriodToApi(period: KpiPeriodKey): string {
  if (period === 'this_month') {
    return 'current_month';
  }
  return period;
}

function buildKpiSummaryQuery(params: FetchKpiSummaryParams): string {
  const search = new URLSearchParams();

  if ('startDate' in params) {
    search.set('startDate', params.startDate);
    search.set('endDate', params.endDate);
    return search.toString();
  }

  search.set('period', mapPeriodToApi(params.period));
  return search.toString();
}

export const fetchKpiHistoryByOrderId_Service = createAsyncThunk(
  'kpi/fetchHistoryByOrderId',
  async (orderId: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetKpiHistoryByOrderIdResponse>(
        `/api/kpi/history/${encodeURIComponent(orderId)}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not load order details',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const assignKpiHistorySalesPerson_Service = createAsyncThunk(
  'kpi/assignHistorySalesPerson',
  async (params: AssignKpiHistorySalesPersonParams, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.patch<AssignKpiHistorySalesPersonResponse>(
        `/api/kpi/history/${encodeURIComponent(params.orderId)}/sales-person`,
        { salesPersonId: params.salesPersonId },
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not assign sales person',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const fetchKpiSummary_Service = createAsyncThunk(
  'kpi/fetchSummary',
  async (params: FetchKpiSummaryParams, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const query = buildKpiSummaryQuery(params);
      const response = await apiClient.get<GetKpiSummaryResponse>(`/api/kpi/summary?${query}`);

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not load KPI summary',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
