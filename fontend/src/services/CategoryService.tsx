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
  async (payload: CreateCategoryRequest) => {
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

      if (isHttpSuccess(response.status)) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not create category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Create category error:---', error);
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

export const updateCategory_Service = createAsyncThunk(
  'category/update',
  async (payload: UpdateCategoryPayload) => {
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

      if (isHttpSuccess(response.status)) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not update category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Update category error:---', error);
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

export const deleteCategory_Service = createAsyncThunk(
  'category/delete',
  async (id: string) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<{ success: boolean; message?: string; id?: string }>(
        `/api/categories/${id}`,
      );

      if (isHttpSuccess(response.status)) {
        return id;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not delete category',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Delete category error:---', error);
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

export const fetchCategories_Service = createAsyncThunk(
  'category/fetchAll',
  async (_void) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCategoriesResponse>('/api/categories');

      if (isHttpSuccess(response.status)) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load categories',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Fetch categories error:---', error);
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
