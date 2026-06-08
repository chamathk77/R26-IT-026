import { createSlice } from '@reduxjs/toolkit';
import {
  fetchPaymentsByShop_Service,
  paymentSubmit_Service,
} from '../../services/PaymentService';
import { PaymentRecord, SubmitPaymentReceiptResponse } from '../../type/payment';
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
  submit: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: SubmitPaymentReceiptResponse | null;
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
  submit: {
    loading: false,
    error: null,
    success: false,
    data: null,
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
    clearPaymentSubmit: (state) => {
      state.submit.loading = false;
      state.submit.error = null;
      state.submit.success = false;
      state.submit.data = null;
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

    builder.addCase(paymentSubmit_Service.pending, (state) => {
      state.submit.loading = true;
      state.submit.error = null;
      state.submit.success = false;
      state.submit.data = null;
    });
    builder.addCase(paymentSubmit_Service.fulfilled, (state, action) => {
      state.submit.loading = false;
      state.submit.success = true;
      state.submit.error = null;
      state.submit.data = action.payload;

      const updatedPayment = action.payload.payment;
      const index = state.shopPayments.items.findIndex(
        (item) => item._id === updatedPayment._id,
      );
      if (index >= 0) {
        state.shopPayments.items[index] = updatedPayment;
      }
    });
    builder.addCase(paymentSubmit_Service.rejected, (state, action) => {
      state.submit.loading = false;
      state.submit.success = false;
      state.submit.data = null;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.submit.error =
        payload?.message || action.error.message || 'Could not submit payment';
    });
  },
});

export const { clearShopPayments, clearPaymentSubmit } = PaymentSlice.actions;

export default PaymentSlice.reducer;
