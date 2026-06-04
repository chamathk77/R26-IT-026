import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import {
  CreateShopOnboardingRequest,
  CreateShopOnboardingResponse,
  UpdateShopFeaturesRequest,
  UpdateShopFeaturesResponse,
} from '../type/shopOnboarding';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const createShopOnboarding_Service = createAsyncThunk(
  'shopOnboarding/createShop',
  async (payload: CreateShopOnboardingRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<CreateShopOnboardingResponse>(
        '/api/shops/onboarding',
        payload,
      );

      if (isHttpSuccess(response.status)) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Shop onboarding failed',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: unknown) {
      const err = error as ApiErrorResponse & Error;
      if (err.error && err.message && err.status && err.timestamp) {
        return rejectWithValue(err.message);
      }
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Shop onboarding failed. Please try again.');
    }
  },
);

export const updateShopFeatures_Service = createAsyncThunk(
  'shopOnboarding/updateFeatures',
  async (payload: UpdateShopFeaturesRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<UpdateShopFeaturesResponse>(
        '/api/shops/features',
        payload,
      );

      if (isHttpSuccess(response.status)) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Shop features update failed',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: unknown) {
      const err = error as ApiErrorResponse & Error;
      if (err.error && err.message && err.status && err.timestamp) {
        return rejectWithValue(err.message);
      }
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Shop features update failed. Please try again.');
    }
  },
);
