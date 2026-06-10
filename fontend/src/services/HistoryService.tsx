import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
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
    } catch (error: unknown) {
      throw toApiErrorResponse(error);
    }
  },
);
