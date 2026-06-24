import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../config/apiConfig";
import { ensureInternetConnection } from "../utils/checkInternetConnection";
import { ApiErrorResponse } from "../type/common";
import { toApiErrorResponse } from "../utils/apiErrorAlert";
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
  SetSubscriptionRequest,
  SetSubscriptionResponse,
  RemoveOnboardingDataRequest,
  RemoveOnboardingDataResponse,
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      console.log("error in create shop onboarding service", error);
      return rejectWithValue(toApiErrorResponse(error));
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const signupOnboarding_Service = createAsyncThunk(
  "shopOnboarding/signupOwner",
  async (payload: SignupOnboardingRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<SignupOnboardingResponse>(
        "/api/auth/signupOnboarding",
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const setSubscription_Service = createAsyncThunk(
  "shopOnboarding/setSubscription",
  async (payload: SetSubscriptionRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<SetSubscriptionResponse>(
        "/api/shops/subscription",
        payload,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Set subscription response:", response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Subscription update failed",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const removeOnboardingData_Service = createAsyncThunk(
  "shopOnboarding/removeOnboardingData",
  async (payload: RemoveOnboardingDataRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<RemoveOnboardingDataResponse>(
        "/api/shops/remove-onboarding",
        payload,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Remove onboarding data response:", response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Failed to remove onboarding data",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
