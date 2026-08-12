import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  CreateCostCategoryRequest,
  CreateCostCategoryResponse,
  DeleteCostCategoryResponse,
  GetCostCategoriesResponse,
  GetCostCategoryByIdResponse,
  UpdateCostCategoryPayload,
  UpdateCostCategoryResponse,
} from '../type/costCategory';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const fetchCostCategories_Service = createAsyncThunk(
  'costCategory/fetchAll',
  async (_void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCostCategoriesResponse>('/api/cost-categories');

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load cost categories',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('error in fetchCostCategories_Service', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const fetchCostCategoryById_Service = createAsyncThunk(
  'costCategory/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCostCategoryByIdResponse>(
        `/api/cost-categories/${encodeURIComponent(id)}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load cost category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const createCostCategory_Service = createAsyncThunk(
  'costCategory/create',
  async (payload: CreateCostCategoryRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<CreateCostCategoryResponse>(
        '/api/cost-categories',
        {
          name: payload.name.trim(),
          colorCode: payload.colorCode.trim().toUpperCase(),
        },
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not create cost category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const updateCostCategory_Service = createAsyncThunk(
  'costCategory/update',
  async (payload: UpdateCostCategoryPayload, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.put<UpdateCostCategoryResponse>(
        `/api/cost-categories/${encodeURIComponent(payload.id)}`,
        {
          name: payload.name.trim(),
          colorCode: payload.colorCode.trim().toUpperCase(),
        },
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not update cost category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const deleteCostCategory_Service = createAsyncThunk(
  'costCategory/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<DeleteCostCategoryResponse>(
        `/api/cost-categories/${encodeURIComponent(id)}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not delete cost category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
