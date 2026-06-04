import { createSlice } from '@reduxjs/toolkit';
import { createShopOnboarding_Service } from '../../services/ShopOnboardingService';
import { CreateShopOnboardingResponse } from '../../type/shopOnboarding';

interface ShopOnboardingState {
  createShop: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: CreateShopOnboardingResponse | null;
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
};

export const ShopOnboardingSlice = createSlice({
  name: 'shopOnboarding',
  initialState,
  reducers: {
    resetCreateShopOnboarding: (state) => {
      state.createShop = { ...initialState.createShop };
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
  },
});

export const { resetCreateShopOnboarding } = ShopOnboardingSlice.actions;

export default ShopOnboardingSlice.reducer;
