import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import { StartTrialRequest, StartTrialResponse, SkipTrialRequest, SkipTrialResponse } from '../type/trial';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const startTrial_Service = createAsyncThunk(
  'trial/start',
  async (payload: StartTrialRequest, { rejectWithValue }) => {
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const skipTrial_Service = createAsyncThunk(
  'trial/skip',
  async (payload: SkipTrialRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<SkipTrialResponse>(
        '/api/shops/skip-trial',
        payload,
      );

      if (isHttpSuccess(response.status)) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not skip trial',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
