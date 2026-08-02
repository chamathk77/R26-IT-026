import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  ForgotPasswordResetRequest,
  ForgotPasswordResetResponse,
  ForgotPasswordSendOtpRequest,
  ForgotPasswordSendOtpResponse,
  ForgotPasswordVerifyOtpRequest,
  ForgotPasswordVerifyOtpResponse,
} from '../type/forgotPassword';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const sendForgotPasswordOtp_Service = createAsyncThunk(
  'auth/forgotPasswordSendOtp',
  async (payload: ForgotPasswordSendOtpRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<ForgotPasswordSendOtpResponse>(
        '/api/auth/forgot-password/send-otp',
        payload,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not send OTP',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const verifyForgotPasswordOtp_Service = createAsyncThunk(
  'auth/forgotPasswordVerifyOtp',
  async (payload: ForgotPasswordVerifyOtpRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<ForgotPasswordVerifyOtpResponse>(
        '/api/auth/forgot-password/verify-otp',
        payload,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not verify OTP',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const resetForgotPassword_Service = createAsyncThunk(
  'auth/forgotPasswordReset',
  async (payload: ForgotPasswordResetRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<ForgotPasswordResetResponse>(
        '/api/auth/forgot-password/reset-password',
        payload,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not reset password',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
