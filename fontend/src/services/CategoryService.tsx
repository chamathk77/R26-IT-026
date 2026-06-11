import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  CreateCategoryRequest,
  CreateCategoryResponse,
  DeleteCategoryResponse,
  GetCategoriesResponse,
  GetCategoryByIdResponse,
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

      if (isHttpSuccess(response.status) && response.data?.success) {
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
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const updateCategory_Service = createAsyncThunk(
  'category/update',
  async (payload: UpdateCategoryPayload, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<UpdateCategoryResponse>(
        `/api/categories/${encodeURIComponent(payload.id)}/update`,
        {
          name: payload.name.trim(),
          description: payload.description.trim(),
          colorCode: payload.colorCode.trim().toUpperCase(),
        },
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
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
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const deleteCategory_Service = createAsyncThunk(
  'category/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<DeleteCategoryResponse>(
        `/api/categories/${encodeURIComponent(id)}/delete`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not delete category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const fetchCategoryById_Service = createAsyncThunk(
  'category/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCategoryByIdResponse>(
        `/api/categories/${encodeURIComponent(id)}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const fetchCategories_Service = createAsyncThunk(
  'category/fetchAll',
  async (_void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCategoriesResponse>('/api/categories');

      if (isHttpSuccess(response.status) && response.data?.success) {
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
      const apiError = toApiErrorResponse(error);
      console.log('error in fetchCategories_Service', apiError);
      return rejectWithValue(apiError);
    }
  },
);
