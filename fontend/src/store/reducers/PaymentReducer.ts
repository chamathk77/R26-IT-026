import { createSlice } from '@reduxjs/toolkit';
import { fetchPaymentsByShop_Service } from '../../services/PaymentService';
import { PaymentRecord } from '../../type/payment';
import { ApiErrorResponse } from '../../type/common';

interface PaymentState {
  shopPayments: {
    loading: boolean;
    error: string | null;
    success: boolean;
    shopId: string | null;
    count: number;
    items: PaymentRecord[];
  };
}

const initialState: PaymentState = {
  shopPayments: {
    loading: false,
    error: null,
    success: false,
    shopId: null,
    count: 0,
    items: [],
  },
};

export const PaymentSlice = createSlice({
  name: 'Payment',
  initialState,
  reducers: {
    clearShopPayments: (state) => {
      state.shopPayments.loading = false;
      state.shopPayments.error = null;
      state.shopPayments.success = false;
      state.shopPayments.shopId = null;
      state.shopPayments.count = 0;
      state.shopPayments.items = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchPaymentsByShop_Service.pending, (state) => {
      state.shopPayments.loading = true;
      state.shopPayments.error = null;
      state.shopPayments.success = false;
    });
    builder.addCase(fetchPaymentsByShop_Service.fulfilled, (state, action) => {
      state.shopPayments.loading = false;
      state.shopPayments.success = true;
      state.shopPayments.error = null;
      state.shopPayments.shopId = action.payload.shopId;
      state.shopPayments.count = action.payload.count;
      state.shopPayments.items = Array.isArray(action.payload.payments)
        ? action.payload.payments
        : [];
    });
    builder.addCase(fetchPaymentsByShop_Service.rejected, (state, action) => {
      state.shopPayments.loading = false;
      state.shopPayments.success = false;
      state.shopPayments.items = [];
      state.shopPayments.count = 0;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.shopPayments.error =
        payload?.message || action.error.message || 'Could not load payments';
    });
  },
});

export const { clearShopPayments } = PaymentSlice.actions;

export default PaymentSlice.reducer;
