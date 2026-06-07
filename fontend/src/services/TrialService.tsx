import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { StartTrialRequest, StartTrialResponse } from '../type/trial';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const startTrial_Service = createAsyncThunk(
  'trial/start',
  async (payload: StartTrialRequest) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<StartTrialResponse>(
        '/api/shops/start-trial',
        payload,
      );

      if (isHttpSuccess(response.status)) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not start trial',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'error' in error &&
        'message' in error &&
        'status' in error &&
        'timestamp' in error
      ) {
        throw error as ApiErrorResponse;
      }

      const message =
        error instanceof Error
          ? error.message
          : 'Network error. Please check your connection and try again.';

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message,
        status: 400,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);
