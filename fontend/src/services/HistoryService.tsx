import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { GetHistoryResponse, HistoryScope } from '../type/history';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const fetchHistory_Service = createAsyncThunk(
  'history/fetch',
  async (scope: HistoryScope = 'mine') => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetHistoryResponse>('/api/history', {
        params: { scope },
      });

      if (isHttpSuccess(response.status)) {
        console.log('Fetch history response:', response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load history',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Fetch history error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);
