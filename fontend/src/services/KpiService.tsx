import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { KpiPeriodKey } from '../type/kpi';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import { FetchKpiSummaryParams, GetKpiSummaryResponse } from '../type/kpi';

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
