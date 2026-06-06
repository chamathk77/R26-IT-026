import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../config/apiConfig";
import { ensureInternetConnection } from "../utils/checkInternetConnection";
import { ApiErrorResponse } from "../type/common";
import {
  CreateShopOnboardingRequest,
  CreateShopOnboardingResponse,
  UpdateShopFeaturesRequest,
  UpdateShopFeaturesResponse,
  SendOtpOnboardingRequest,
  SendOtpOnboardingResponse,
  VerifyOtpOnboardingRequest,
  VerifyOtpOnboardingResponse,
  SignupOnboardingRequest,
  SignupOnboardingResponse,
} from "../type/shopOnboarding";

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const createShopOnboarding_Service = createAsyncThunk(
  "shopOnboarding/createShop",
  async (payload: CreateShopOnboardingRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<CreateShopOnboardingResponse>(
        "/api/shops/onboarding",
        payload,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Create shop onboarding response:", response.data);

        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Shop onboarding failed",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log("Create shop onboarding error:---", error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: "Network Error",
        message:
          error.message ||
          "Network error. Please check your connection and try again.",
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const updateShopFeatures_Service = createAsyncThunk(
  "shopOnboarding/updateFeatures",
  async (payload: UpdateShopFeaturesRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<UpdateShopFeaturesResponse>(
        "/api/shops/features",
        payload,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Update shop features response:", response.data);

        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Shop features update failed",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log("Update shop features error:---", error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: "Network Error",
        message:
          error.message ||
          "Network error. Please check your connection and try again.",
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const sendOtpOnboarding_Service = createAsyncThunk(
  "shopOnboarding/sendOtp",
  async (payload: SendOtpOnboardingRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<SendOtpOnboardingResponse>(
        "/api/auth/send-otp",
        payload,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Send OTP onboarding response:", response.data);

        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Failed to send OTP",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log("Send OTP onboarding error:---", error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: "Network Error",
        message:
          error.message ||
          "Network error. Please check your connection and try again.",
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const verifyOtpOnboarding_Service = createAsyncThunk(
  "shopOnboarding/verifyOtp",
  async (payload: VerifyOtpOnboardingRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<VerifyOtpOnboardingResponse>(
        "/api/auth/verify-otp",
        payload,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Verify OTP onboarding response:", response.data);

        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "OTP verification failed",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log("Verify OTP onboarding error:---", error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: "Network Error",
        message:
          error.message ||
          "Network error. Please check your connection and try again.",
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const signupOnboarding_Service = createAsyncThunk(
  "shopOnboarding/signupOwner",
  async (payload: SignupOnboardingRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<SignupOnboardingResponse>(
        "/api/auth/signupOnbading",
        payload,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Signup onboarding response:", response.data);

        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Account creation failed",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log("Signup onboarding error:---", error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: "Network Error",
        message:
          error.message ||
          "Network error. Please check your connection and try again.",
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);
