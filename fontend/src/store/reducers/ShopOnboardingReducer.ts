import { createSlice } from '@reduxjs/toolkit';
import {
  createShopOnboarding_Service,
  updateShopFeatures_Service,
  sendOtpOnboarding_Service,
  verifyOtpOnboarding_Service,
  signupOnboarding_Service,
} from '../../services/ShopOnboardingService';
import {
  CreateShopOnboardingResponse,
  UpdateShopFeaturesResponse,
  SendOtpOnboardingResponse,
  VerifyOtpOnboardingResponse,
  SignupOnboardingResponse,
} from '../../type/shopOnboarding';

interface ShopOnboardingState {
  createShop: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: CreateShopOnboardingResponse | null;
    shopId: string | null;
    onboardStep: string | null;
  };
  updateFeatures: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: UpdateShopFeaturesResponse | null;
    shopId: string | null;
    onboardStep: string | null;
  };
  sendOtp: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: SendOtpOnboardingResponse | null;
    otpTimerSeconds: number | null;
  };
  verifyOtp: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: VerifyOtpOnboardingResponse | null;
  };
  signupOwner: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: SignupOnboardingResponse | null;
  };
}

const initialState: ShopOnboardingState = {
  createShop: {
    loading: false,
    error: null,
    success: false,
    data: null,
    shopId: null,
    onboardStep: null,
  },
  updateFeatures: {
    loading: false,
    error: null,
    success: false,
    data: null,
    shopId: null,
    onboardStep: null,
  },
  sendOtp: {
    loading: false,
    error: null,
    success: false,
    data: null,
    otpTimerSeconds: null,
  },
  verifyOtp: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
  signupOwner: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
};

export const ShopOnboardingSlice = createSlice({
  name: 'shopOnboarding',
  initialState,
  reducers: {
    resetCreateShopOnboarding: (state) => {
      state.createShop = { ...initialState.createShop };
    },
    resetUpdateShopFeatures: (state) => {
      state.updateFeatures = { ...initialState.updateFeatures };
    },
    resetSendOtpOnboarding: (state) => {
      state.sendOtp = { ...initialState.sendOtp };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createShopOnboarding_Service.pending, (state) => {
      state.createShop.loading = true;
      state.createShop.error = null;
      state.createShop.success = false;
    });
    builder.addCase(createShopOnboarding_Service.fulfilled, (state, action) => {
      state.createShop.loading = false;
      state.createShop.success = true;
      state.createShop.error = null;
      state.createShop.data = action.payload;
      state.createShop.shopId = action.payload.shopId;
      state.createShop.onboardStep = action.payload.onboardStep;
    });
    builder.addCase(createShopOnboarding_Service.rejected, (state, action) => {
      state.createShop.loading = false;
      state.createShop.success = false;
      state.createShop.error =
        (action.payload as string) || action.error.message || 'Shop onboarding failed';
      state.createShop.data = null;
      state.createShop.shopId = null;
      state.createShop.onboardStep = null;
    });

    builder.addCase(updateShopFeatures_Service.pending, (state) => {
      state.updateFeatures.loading = true;
      state.updateFeatures.error = null;
      state.updateFeatures.success = false;
    });
    builder.addCase(updateShopFeatures_Service.fulfilled, (state, action) => {
      state.updateFeatures.loading = false;
      state.updateFeatures.success = true;
      state.updateFeatures.error = null;
      state.updateFeatures.data = action.payload;
      state.updateFeatures.shopId = action.payload.shopId;
      state.updateFeatures.onboardStep = action.payload.onboardStep;
    });
    builder.addCase(updateShopFeatures_Service.rejected, (state, action) => {
      state.updateFeatures.loading = false;
      state.updateFeatures.success = false;
      state.updateFeatures.error =
        (action.payload as string) ||
        action.error.message ||
        'Shop features update failed';
      state.updateFeatures.data = null;
      state.updateFeatures.shopId = null;
      state.updateFeatures.onboardStep = null;
    });

    builder.addCase(sendOtpOnboarding_Service.pending, (state) => {
      state.sendOtp.loading = true;
      state.sendOtp.error = null;
      state.sendOtp.success = false;
    });
    builder.addCase(sendOtpOnboarding_Service.fulfilled, (state, action) => {
      state.sendOtp.loading = false;
      state.sendOtp.success = true;
      state.sendOtp.error = null;
      state.sendOtp.data = action.payload;
      state.sendOtp.otpTimerSeconds = action.payload.otpTimerSeconds;
    });
    builder.addCase(sendOtpOnboarding_Service.rejected, (state, action) => {
      state.sendOtp.loading = false;
      state.sendOtp.success = false;
      state.sendOtp.error =
        (action.payload as string) || action.error.message || 'Failed to send OTP';
      state.sendOtp.data = null;
      state.sendOtp.otpTimerSeconds = null;
    });

    builder.addCase(verifyOtpOnboarding_Service.pending, (state) => {
      state.verifyOtp.loading = true;
      state.verifyOtp.error = null;
      state.verifyOtp.success = false;
    });
    builder.addCase(verifyOtpOnboarding_Service.fulfilled, (state, action) => {
      state.verifyOtp.loading = false;
      state.verifyOtp.success = true;
      state.verifyOtp.error = null;
      state.verifyOtp.data = action.payload;
    });
    builder.addCase(verifyOtpOnboarding_Service.rejected, (state, action) => {
      state.verifyOtp.loading = false;
      state.verifyOtp.success = false;
      state.verifyOtp.error =
        (action.payload as string) || action.error.message || 'OTP verification failed';
      state.verifyOtp.data = null;
    });

    builder.addCase(signupOnboarding_Service.pending, (state) => {
      state.signupOwner.loading = true;
      state.signupOwner.error = null;
      state.signupOwner.success = false;
    });
    builder.addCase(signupOnboarding_Service.fulfilled, (state, action) => {
      state.signupOwner.loading = false;
      state.signupOwner.success = true;
      state.signupOwner.error = null;
      state.signupOwner.data = action.payload;
    });
    builder.addCase(signupOnboarding_Service.rejected, (state, action) => {
      state.signupOwner.loading = false;
      state.signupOwner.success = false;
      state.signupOwner.error =
        (action.payload as string) || action.error.message || 'Account creation failed';
      state.signupOwner.data = null;
    });
  },
});

export const {
  resetCreateShopOnboarding,
  resetUpdateShopFeatures,
  resetSendOtpOnboarding,
} = ShopOnboardingSlice.actions;

export default ShopOnboardingSlice.reducer;
