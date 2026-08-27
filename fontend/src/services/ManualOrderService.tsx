import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  AcceptManualOrderResponse,
  GetBranchOrderQrResponse,
  GetManualOrderCountResponse,
  GetManualOrdersResponse,
  RejectManualOrderResponse,
} from '../type/manualOrder';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const fetchManualOrders_Service = createAsyncThunk(
  'manualOrder/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetManualOrdersResponse>('/api/manual-orders');

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load manual orders',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

/** Lightweight poll used by the home screen badge. */
export const fetchManualOrderCount_Service = createAsyncThunk(
  'manualOrder/fetchCount',
  async (_, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetManualOrderCountResponse>(
        '/api/manual-orders/count',
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data.data.count;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load manual order count',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const acceptManualOrder_Service = createAsyncThunk(
  'manualOrder/accept',
  async (sessionId: string, { dispatch, rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<AcceptManualOrderResponse>(
        `/api/manual-orders/${sessionId}/accept`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        await dispatch(fetchManualOrders_Service());
        return response.data.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not accept the manual order',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const rejectManualOrder_Service = createAsyncThunk(
  'manualOrder/reject',
  async (sessionId: string, { dispatch, rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<RejectManualOrderResponse>(
        `/api/manual-orders/${sessionId}/reject`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        await dispatch(fetchManualOrders_Service());
        return { sessionId };
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not reject the manual order',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

/** QR payload for the branch in the current session token. */
export const fetchBranchOrderQr_Service = createAsyncThunk(
  'manualOrder/fetchBranchQr',
  async (_, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetBranchOrderQrResponse>('/api/manual-orders/qr');

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load the branch QR code',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
