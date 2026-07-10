import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../config/apiConfig";
import { ensureInternetConnection } from "../utils/checkInternetConnection";
import { ApiErrorResponse } from "../type/common";
import { toApiErrorResponse } from "../utils/apiErrorAlert";
import {
  CreateShopOnboardingRequest,
  CreateShopOnboardingResponse,
  GetShopFeaturesResponse,
  GetShopModuleFeaturesResponse,
  OnboardingShopFeaturesRequest,
  UpdateShopFeaturesRequest,
  UpdateShopFeaturesResponse,
  UpdateShopModuleFeaturesRequest,
  UpdateShopModuleFeaturesResponse,
  GetShopUsersFeaturesResponse,
  UpdateShopUsersFeaturesRequest,
  UpdateShopUsersFeaturesResponse,
  SendOtpOnboardingRequest,
  SendOtpOnboardingResponse,
  VerifyOtpOnboardingRequest,
  VerifyOtpOnboardingResponse,
  SignupOnboardingRequest,
  SignupOnboardingResponse,
  SetSubscriptionRequest,
  SetSubscriptionResponse,
  GetSubscriptionPlansResponse,
  RemoveOnboardingDataRequest,
  RemoveOnboardingDataResponse,
  GetSmsPackagesResponse,
  GetShopSmsFeaturesResponse,
  ManageSmsFeatureRequest,
  ManageSmsFeatureResponse,
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

export const fetchShopFeatures_Service = createAsyncThunk(
  "shopOnboarding/fetchFeatures",
  async (shopId: string | undefined, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const query = shopId?.trim()
        ? `?shopId=${encodeURIComponent(shopId.trim())}`
        : "";
      const response = await apiClient.get<GetShopFeaturesResponse>(
        `/api/shops/features${query}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Could not load shop features",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const fetchShopModuleFeatures_Service = createAsyncThunk(
  "shopOnboarding/fetchModuleFeatures",
  async (shopId: string | undefined, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const query = shopId?.trim()
        ? `?shopId=${encodeURIComponent(shopId.trim())}`
        : "";
      const response = await apiClient.get<GetShopModuleFeaturesResponse>(
        `/api/shops/features/modules${query}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Could not load shop module features",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const updateShopModuleFeatures_Service = createAsyncThunk(
  "shopOnboarding/updateModuleFeatures",
  async (payload: UpdateShopModuleFeaturesRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.put<UpdateShopModuleFeaturesResponse>(
        "/api/shops/features/modules",
        payload,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Updated shop module features response:", response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Shop module features update failed",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const fetchShopUsersFeatures_Service = createAsyncThunk(
  "shopOnboarding/fetchUsersFeatures",
  async (shopId: string | undefined, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const query = shopId?.trim()
        ? `?shopId=${encodeURIComponent(shopId.trim())}`
        : "";
      const response = await apiClient.get<GetShopUsersFeaturesResponse>(
        `/api/shops/features/users${query}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Could not load shop user settings",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const updateShopUsersFeatures_Service = createAsyncThunk(
  "shopOnboarding/updateUsersFeatures",
  async (payload: UpdateShopUsersFeaturesRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.put<UpdateShopUsersFeaturesResponse>(
        "/api/shops/features/users",
        payload,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Updated shop user settings response:", response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Shop user settings update failed",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const onboardingShopFeatures_Service = createAsyncThunk(
  "shopOnboarding/onboardingFeatures",
  async (payload: OnboardingShopFeaturesRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<UpdateShopFeaturesResponse>(
        "/api/shops/features/onboarding",
        payload,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Onboarding shop features response:", response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Shop features save failed",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const updatedShopFeatures_Service = createAsyncThunk(
  "shopOnboarding/updatedFeatures",
  async (payload: UpdateShopFeaturesRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.put<UpdateShopFeaturesResponse>(
        "/api/shops/features",
        payload,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Updated shop features response:", response.data);
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

export const fetchSubscriptionPlans_Service = createAsyncThunk(
  "shopOnboarding/fetchSubscriptionPlans",
  async (_void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetSubscriptionPlansResponse>(
        "/api/shops/subscription-plans",
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Could not load subscription plans",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const fetchSmsPackages_Service = createAsyncThunk(
  "shopOnboarding/fetchSmsPackages",
  async (_void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetSmsPackagesResponse>("/api/shops/sms-packages");

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Could not load SMS packages",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const fetchShopSmsFeatures_Service = createAsyncThunk(
  "shopOnboarding/fetchSmsFeatures",
  async (shopId: string | undefined, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const query = shopId?.trim()
        ? `?shopId=${encodeURIComponent(shopId.trim())}`
        : "";
      const response = await apiClient.get<GetShopSmsFeaturesResponse>(
        `/api/shops/features/sms${query}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Could not load SMS settings",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const manageSmsFeature_Service = createAsyncThunk(
  "shopOnboarding/manageSmsFeature",
  async (payload: ManageSmsFeatureRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.put<ManageSmsFeatureResponse>(
        "/api/shops/features/sms/manage",
        payload,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "SMS feature update failed",
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
