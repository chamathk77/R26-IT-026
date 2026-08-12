import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  GetHistoryResponse,
  CreateHistoryRequest,
  CreateHistoryResponse,
  HistoryFilters,
  ReverseHistoryRequest,
  ReverseHistoryResponse,
  ResendBillSmsRequest,
  ResendBillSmsResponse,
} from '../type/history';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function buildHistoryQueryParams(filters: HistoryFilters = {}) {
  const params: Record<string, string | number> = {
    scope: filters.scope ?? 'all',
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  };

  if (filters.from?.trim()) {
    params.from = filters.from.trim();
  }
  if (filters.to?.trim()) {
    params.to = filters.to.trim();
  }
  if (filters.paymentOption) {
    params.paymentOption = filters.paymentOption;
  }
  if (filters.orderId?.trim()) {
    params.orderId = filters.orderId.trim();
  }
  if (filters.cartNumber != null && filters.cartNumber > 0) {
    params.cartNumber = filters.cartNumber;
  }
  if (filters.mobile?.trim()) {
    params.mobile = filters.mobile.trim();
  }

  return params;
}

export const fetchHistory_Service = createAsyncThunk(
  'history/fetch',
  async (filters: HistoryFilters = {}, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetHistoryResponse>('/api/history', {
        params: buildHistoryQueryParams(filters),
      });

      if (isHttpSuccess(response.status) && response.data?.success) {
        return {
          ...response.data,
          append: Boolean(filters.append),
        };
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load history',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const createHistory_Service = createAsyncThunk(
  'history/create',
  async (payload: CreateHistoryRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<CreateHistoryResponse>('/api/history/checkout', payload);

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not save checkout history',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const reverseHistory_Service = createAsyncThunk(
  'history/reverse',
  async (payload: ReverseHistoryRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<ReverseHistoryResponse>(
        `/api/history/${encodeURIComponent(payload.id)}/reverse`,
        { status: payload.status },
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not reverse history record',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const resendBillSms_Service = createAsyncThunk(
  'history/resendBillSms',
  async (payload: ResendBillSmsRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<ResendBillSmsResponse>(
        `/api/history/${encodeURIComponent(payload.id)}/resend-bill`,
        { customerMobile: payload.customerMobile },
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not resend bill SMS',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
