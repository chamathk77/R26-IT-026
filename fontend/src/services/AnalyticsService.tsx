import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  AnalyticsPeriodKey,
  FetchAnalyticsOverviewParams,
  GetAnalyticsOverviewResponse,
} from '../type/analytics';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function mapPeriodToApi(period: AnalyticsPeriodKey): string {
  if (period === 'this_month') {
    return 'current_month';
  }
  if (period === 'last_year') {
    return 'last_1_year';
  }
  return period;
}

function buildAnalyticsOverviewQuery(params: FetchAnalyticsOverviewParams): string {
  const search = new URLSearchParams();

  if ('startDate' in params) {
    search.set('startDate', params.startDate);
    search.set('endDate', params.endDate);
    return search.toString();
  }

  search.set('period', mapPeriodToApi(params.period));
  return search.toString();
}

export const fetchAnalyticsOverview_Service = createAsyncThunk(
  'analytics/fetchOverview',
  async (params: FetchAnalyticsOverviewParams, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const query = buildAnalyticsOverviewQuery(params);
      const response = await apiClient.get<GetAnalyticsOverviewResponse>(
        `/api/analytics/overview?${query}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not load analytics overview',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
