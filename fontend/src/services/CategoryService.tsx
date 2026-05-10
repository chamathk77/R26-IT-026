import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import {
  CreateCategoryRequest,
  CreateCategoryResponse,
  GetCategoriesResponse,
  UpdateCategoryPayload,
  UpdateCategoryResponse,
} from '../type/category';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const createCategory_Service = createAsyncThunk(
  'category/create',
  async (payload: CreateCategoryRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<CreateCategoryResponse>(
        '/api/categories',
        {
          name: payload.name.trim(),
          description: payload.description.trim(),
          colorCode: payload.colorCode.trim().toUpperCase(),
        },
      );
 

      if (isHttpSuccess(response.status) && response.data?.success !== false) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not create category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create category';
      return rejectWithValue({
        error: 'Network Error',
        message,
        status: 0,
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse);
    }
  },
);

export const updateCategory_Service = createAsyncThunk(
  'category/update',
  async (payload: UpdateCategoryPayload, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.put<UpdateCategoryResponse>(
        `/api/categories/${payload.id}`,
        {
          name: payload.name.trim(),
          description: payload.description.trim(),
          colorCode: payload.colorCode.trim().toUpperCase(),
        },
      );

      if (isHttpSuccess(response.status) && response.data?.success !== false) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not update category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update category';
      return rejectWithValue({
        error: 'Network Error',
        message,
        status: 0,
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse);
    }
  },
);

export const deleteCategory_Service = createAsyncThunk(
  'category/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<{ success: boolean; message?: string; id?: string }>(
        `/api/categories/${id}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success !== false) {
        return id;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not delete category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete category';
      return rejectWithValue({
        error: 'Network Error',
        message,
        status: 0,
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse);
    }
  },
);

export const fetchCategories_Service = createAsyncThunk(
  'category/fetchAll',
  async (_void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCategoriesResponse>('/api/categories');

      if (isHttpSuccess(response.status) && response.data?.success !== false) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load categories',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load categories';
      return rejectWithValue({
        error: 'Network Error',
        message,
        status: 0,
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse);
    }
  },
);
