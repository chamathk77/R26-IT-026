import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import {
  CreateProductRequest,
  CreateProductResponse,
  GetProductsResponse,
  UpdateProductPayload,
  UpdateProductResponse,
} from '../type/product';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function buildProductFormData(payload: CreateProductRequest): FormData {
  const formData = new FormData();
  formData.append('name', payload.name.trim());
  formData.append('category', payload.category);
  formData.append('price', String(payload.price));

  if (payload.imageUri) {
    const uri = payload.imageUri;
    const fileName = uri.split('/').pop() ?? `product-${Date.now()}.jpg`;
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeType =
      extension === 'png'
        ? 'image/png'
        : extension === 'gif'
          ? 'image/gif'
          : extension === 'webp'
            ? 'image/webp'
            : 'image/jpeg';

    formData.append('image', {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }

  return formData;
}

export const createProduct_Service = createAsyncThunk(
  'product/create',
  async (payload: CreateProductRequest) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<CreateProductResponse>(
        '/api/products',
        buildProductFormData(payload),
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      if (isHttpSuccess(response.status)) {
        console.log('Create product response:', response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not create product',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Create product error:---', error);
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

export const fetchProducts_Service = createAsyncThunk(
  'product/fetchAll',
  async (_void) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetProductsResponse>('/api/products');

      if (isHttpSuccess(response.status)) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load products',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Fetch products error:---', error);
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

export const updateProduct_Service = createAsyncThunk(
  'product/update',
  async (payload: UpdateProductPayload) => {
    try {
      await ensureInternetConnection();

      const hasImage = Boolean(payload.imageUri);
      const response = hasImage
        ? await apiClient.put<UpdateProductResponse>(
            `/api/products/${payload.id}`,
            buildProductFormData(payload),
            {
              headers: { 'Content-Type': 'multipart/form-data' },
            },
          )
        : await apiClient.put<UpdateProductResponse>(`/api/products/${payload.id}`, {
            name: payload.name.trim(),
            category: payload.category,
            price: payload.price,
          });

      if (isHttpSuccess(response.status)) {
        console.log('Update product response:', response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not update product',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Update product error:---', error);
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
