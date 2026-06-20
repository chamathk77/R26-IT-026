import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  CreateCostExpenseRequest,
  CreateCostExpenseResponse,
} from '../type/costExpense';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function isLocalImageUri(uri: string): boolean {
  return /^(file|content|ph|assets-library):\/\//i.test(uri);
}

function appendImageToFormData(formData: FormData, imageUri: string) {
  const fileName = imageUri.split('/').pop() ?? `expense-${Date.now()}.jpg`;
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
    uri: imageUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
}

function buildCostExpenseFormData(payload: CreateCostExpenseRequest): FormData {
  const formData = new FormData();
  formData.append('expenseName', payload.expenseName.trim());
  formData.append('categoryId', payload.categoryId);
  formData.append('categoryName', payload.categoryName.trim());
  formData.append('amount', String(payload.amount));
  formData.append('isProduct', String(payload.isProduct));

  if (payload.isProduct && payload.qty != null) {
    formData.append('qty', String(payload.qty));
  }

  if (payload.purchaseDate) {
    formData.append('purchaseDate', payload.purchaseDate);
  }

  if (payload.imageUri && isLocalImageUri(payload.imageUri)) {
    appendImageToFormData(formData, payload.imageUri);
  }

  return formData;
}

function buildCostExpenseJsonBody(payload: CreateCostExpenseRequest) {
  const body: Record<string, unknown> = {
    expenseName: payload.expenseName.trim(),
    categoryId: payload.categoryId,
    categoryName: payload.categoryName.trim(),
    amount: payload.amount,
    isProduct: payload.isProduct,
  };

  if (payload.isProduct && payload.qty != null) {
    body.qty = payload.qty;
  }

  if (payload.purchaseDate) {
    body.purchaseDate = payload.purchaseDate;
  }

  return body;
}

export const createCostExpense_Service = createAsyncThunk(
  'costExpense/create',
  async (payload: CreateCostExpenseRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const hasImage = Boolean(payload.imageUri && isLocalImageUri(payload.imageUri));
      const response = await apiClient.post<CreateCostExpenseResponse>(
        '/api/cost-expenses',
        hasImage ? buildCostExpenseFormData(payload) : buildCostExpenseJsonBody(payload),
        hasImage ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not create expense',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
