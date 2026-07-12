import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import type { GetSettingsDataResponse } from '../type/settings';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const fetchSettingsData_Service = createAsyncThunk(
  'settings/fetchSettingsData',
  async (_void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetSettingsDataResponse>(
        '/api/shops/settings-data',
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load settings data',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      console.log('error in fetchSettingsData_Service', toApiErrorResponse(error));
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
