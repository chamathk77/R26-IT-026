import { createSlice } from '@reduxjs/toolkit';
import {
  createShopOnboarding_Service,
  updateShopFeatures_Service,
} from '../../services/ShopOnboardingService';
import {
  CreateShopOnboardingResponse,
  UpdateShopFeaturesResponse,
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
  },
});

export const { resetCreateShopOnboarding, resetUpdateShopFeatures } = ShopOnboardingSlice.actions;

export default ShopOnboardingSlice.reducer;
