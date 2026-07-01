import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient, getApiBaseUrl } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  GetPaymentsByShopResponse,
  GetUpFrontPaymentResponse,
  GetInitialSubscriptionPaymentResponse,
  PaymentSubmitRequest,
  ReverseSubscriptionSelectionResponse,
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

export const fetchUpFrontPayment_Service = createAsyncThunk(
  'payment/fetchUpFront',
  async (_void: void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetUpFrontPaymentResponse>('/api/payments/upfront');

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load up-front payment',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('error in fetchUpFrontPayment_Service', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const fetchInitialSubscriptionPayment_Service = createAsyncThunk(
  'payment/fetchInitialSubscription',
  async (_void: void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetInitialSubscriptionPaymentResponse>(
        '/api/payments/initial-subscription',
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load initial subscription payment',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('error in fetchInitialSubscriptionPayment_Service', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const reverseSubscriptionSelection_Service = createAsyncThunk(
  'payment/reverseSubscriptionSelection',
  async (_void: void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<ReverseSubscriptionSelectionResponse>(
        '/api/payments/reverse-subscription-selection',
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not reverse subscription selection',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('error in reverseSubscriptionSelection_Service', apiError);
      return rejectWithValue(apiError);
    }
  },
);

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
      const apiError = toApiErrorResponse(error);
      console.log('error in fetchPaymentsByShop_Service', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const paymentSubmit_Service = createAsyncThunk(
  'payment/submit',
  async ({ paymentId, imageUri }: PaymentSubmitRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const formData = buildReceiptFormData(imageUri);
      formData.append('paymentId', paymentId);

      const response = await apiClient.post<SubmitPaymentReceiptResponse>(
        `/api/payments/${encodeURIComponent(paymentId)}/submit`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not submit payment receipt',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

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
