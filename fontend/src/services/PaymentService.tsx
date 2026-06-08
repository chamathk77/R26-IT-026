import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient, getApiBaseUrl } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import {
  GetPaymentsByShopResponse,
  SubmitPaymentReceiptResponse,
} from '../type/payment';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function buildReceiptFormData(imageUri: string, shopId?: string): FormData {
  const formData = new FormData();
  const fileName = imageUri.split('/').pop() ?? `receipt-${Date.now()}.jpg`;
  const extension = fileName.split('.').pop()?.toLowerCase();
  const mimeType =
    extension === 'png'
      ? 'image/png'
      : extension === 'gif'
        ? 'image/gif'
        : extension === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

  formData.append('receipt', {
    uri: imageUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  if (shopId) {
    formData.append('shopId', shopId);
  }

  return formData;
}

export const fetchPaymentsByShop_Service = createAsyncThunk(
  'payment/fetchByShop',
  async (shopId: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetPaymentsByShopResponse>(
        `/api/payments/shop/${encodeURIComponent(shopId)}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load payments',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'error' in error &&
        'message' in error &&
        'status' in error &&
        'timestamp' in error
      ) {
        return rejectWithValue(error as ApiErrorResponse);
      }

      const message =
        error instanceof Error
          ? error.message
          : 'Network error. Please check your connection and try again.';

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message,
        status: 400,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(networkError);
    }
  },
);

export async function resubmitPaymentReceipt(
  paymentId: string,
  imageUri: string,
): Promise<SubmitPaymentReceiptResponse> {
  await ensureInternetConnection();

  const response = await apiClient.post<SubmitPaymentReceiptResponse>(
    `/api/payments/${encodeURIComponent(paymentId)}/resubmit`,
    buildReceiptFormData(imageUri),
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  if (isHttpSuccess(response.status) && response.data?.success) {
    return response.data;
  }

  throw new Error('Could not resubmit payment receipt');
}

export function getReceiptImageUrl(receiptImagePath: string | null | undefined): string | null {
  if (!receiptImagePath || receiptImagePath === 'pending-upload') {
    return null;
  }
  if (receiptImagePath.startsWith('http://') || receiptImagePath.startsWith('https://')) {
    return receiptImagePath;
  }
  const base = getApiBaseUrl().replace(/\/$/, '');
  const path = receiptImagePath.startsWith('/') ? receiptImagePath : `/${receiptImagePath}`;
  return `${base}${path}`;
}
