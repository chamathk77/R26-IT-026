import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient, getApiBaseUrl } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  CreateCostExpenseRequest,
  CreateCostExpenseResponse,
  DeleteCostExpenseResponse,
  FetchCostHistoryParams,
  GetCostExpenseByIdResponse,
  GetCostHistoryResponse,
  UpdateCostExpenseRequest,
  UpdateCostExpenseResponse,
} from '../type/costExpense';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function isLocalImageUri(uri: string): boolean {
  return /^(file|content|ph|assets-library):\/\//i.test(uri);
}

function normalizeImageMimeType(
  mimeType?: string | null,
  fileName?: string | null,
  uri?: string,
): string {
  const raw = (mimeType ?? '').toLowerCase().trim();
  if (raw === 'image/jpg' || raw === 'image/pjpeg') return 'image/jpeg';
  if (raw === 'image/heic' || raw === 'image/heif') return 'image/jpeg';
  if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(raw)) {
    return raw;
  }

  const name = fileName ?? uri?.split('/').pop() ?? '';
  const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
  if (extension === 'png') return 'image/png';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic' || extension === 'heif') return 'image/jpeg';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';

  return 'image/jpeg';
}

function resolveUploadFileName(
  mimeType: string,
  fileName?: string | null,
  uri?: string,
): string {
  if (fileName && /\.[a-z0-9]+$/i.test(fileName)) {
    return fileName.replace(/\.(heic|heif)$/i, '.jpg');
  }

  const ext =
    mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/gif'
        ? 'gif'
        : mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';
  return `expense-${Date.now()}.${ext}`;
}

function appendImageToFormData(
  formData: FormData,
  imageUri: string,
  mimeType?: string | null,
  fileName?: string | null,
) {
  const resolvedMimeType = normalizeImageMimeType(mimeType, fileName, imageUri);
  const resolvedFileName = resolveUploadFileName(resolvedMimeType, fileName, imageUri);

  formData.append('image', {
    uri: imageUri,
    name: resolvedFileName,
    type: resolvedMimeType,
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
    appendImageToFormData(
      formData,
      payload.imageUri,
      payload.imageMimeType,
      payload.imageFileName,
    );
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

function buildCostHistoryQuery(params: FetchCostHistoryParams): string {
  const searchParams = new URLSearchParams();
  if (params.startDate?.trim()) {
    searchParams.set('startDate', params.startDate.trim());
  }
  if (params.endDate?.trim()) {
    searchParams.set('endDate', params.endDate.trim());
  }
  if (params.categoryId?.trim()) {
    searchParams.set('categoryId', params.categoryId.trim());
  }
  searchParams.set('page', String(params.page ?? 1));
  searchParams.set('limit', String(params.limit ?? 20));
  return searchParams.toString();
}

export const fetchCostHistory_Service = createAsyncThunk(
  'costExpense/fetchHistory',
  async (params: FetchCostHistoryParams, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const query = buildCostHistoryQuery(params);
      const response = await apiClient.get<GetCostHistoryResponse>(
        `/api/cost-expenses/history?${query}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not load expense history',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export function getCostExpenseImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath || imagePath === 'pending-upload') {
    return null;
  }
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const base = getApiBaseUrl().replace(/\/$/, '');
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${base}${path}`;
}

export const fetchCostExpenseById_Service = createAsyncThunk(
  'costExpense/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCostExpenseByIdResponse>(
        `/api/cost-expenses/${encodeURIComponent(id)}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not load expense details',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

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

function buildUpdateCostExpenseFormData(payload: UpdateCostExpenseRequest): FormData {
  const formData = new FormData();

  if (payload.expenseName) {
    formData.append('expenseName', payload.expenseName.trim());
  }
  if (payload.categoryId) {
    formData.append('categoryId', payload.categoryId);
  }
  if (payload.categoryName) {
    formData.append('categoryName', payload.categoryName.trim());
  }
  if (payload.amount !== undefined) {
    formData.append('amount', String(payload.amount));
  }
  if (payload.isProduct !== undefined) {
    formData.append('isProduct', String(payload.isProduct));
  }
  if (payload.isProduct && payload.qty != null) {
    formData.append('qty', String(payload.qty));
  }
  if (payload.purchaseDate) {
    formData.append('purchaseDate', payload.purchaseDate);
  }
  if (payload.removeImage) {
    formData.append('image', '');
  }
  if (payload.imageUri && isLocalImageUri(payload.imageUri)) {
    appendImageToFormData(
      formData,
      payload.imageUri,
      payload.imageMimeType,
      payload.imageFileName,
    );
  }

  return formData;
}

function buildUpdateCostExpenseJsonBody(payload: UpdateCostExpenseRequest) {
  const body: Record<string, unknown> = {};

  if (payload.expenseName) {
    body.expenseName = payload.expenseName.trim();
  }
  if (payload.categoryId) {
    body.categoryId = payload.categoryId;
  }
  if (payload.categoryName) {
    body.categoryName = payload.categoryName.trim();
  }
  if (payload.amount !== undefined) {
    body.amount = payload.amount;
  }
  if (payload.isProduct !== undefined) {
    body.isProduct = payload.isProduct;
  }
  if (payload.isProduct && payload.qty != null) {
    body.qty = payload.qty;
  }
  if (payload.purchaseDate) {
    body.purchaseDate = payload.purchaseDate;
  }
  if (payload.removeImage) {
    body.image = '';
  }

  return body;
}

export const updateCostExpense_Service = createAsyncThunk(
  'costExpense/update',
  async (payload: UpdateCostExpenseRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const hasNewImage = Boolean(payload.imageUri && isLocalImageUri(payload.imageUri));
      const useMultipart = hasNewImage || Boolean(payload.removeImage);
      const response = await apiClient.put<UpdateCostExpenseResponse>(
        `/api/cost-expenses/${encodeURIComponent(payload.id)}`,
        useMultipart
          ? buildUpdateCostExpenseFormData(payload)
          : buildUpdateCostExpenseJsonBody(payload),
        useMultipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not update expense',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const deleteCostExpense_Service = createAsyncThunk(
  'costExpense/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<DeleteCostExpenseResponse>(
        `/api/cost-expenses/${encodeURIComponent(id)}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return { ...response.data, id };
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not delete expense',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
