import { createSlice } from '@reduxjs/toolkit';
import {
  fetchPaymentsByShop_Service,
  fetchUpFrontPayment_Service,
  fetchInitialSubscriptionPayment_Service,
  paymentSubmit_Service,
} from '../../services/PaymentService';
import { PaymentRecord, SubmitPaymentReceiptResponse } from '../../type/payment';
import { ApiErrorResponse } from '../../type/common';

interface PaymentState {
  upFrontPayment: {
    loading: boolean;
    error: string | null;
    success: boolean;
    shopId: string | null;
    payment: PaymentRecord | null;
  };
  initialSubscriptionPayment: {
    loading: boolean;
    error: string | null;
    success: boolean;
    shopId: string | null;
    shopStatus: string | null;
    subscriptionType: string | null;
    payment: PaymentRecord | null;
  };
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
  upFrontPayment: {
    loading: false,
    error: null,
    success: false,
    shopId: null,
    payment: null,
  },
  initialSubscriptionPayment: {
    loading: false,
    error: null,
    success: false,
    shopId: null,
    shopStatus: null,
    subscriptionType: null,
    payment: null,
  },
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
    clearUpFrontPayment: (state) => {
      state.upFrontPayment.loading = false;
      state.upFrontPayment.error = null;
      state.upFrontPayment.success = false;
      state.upFrontPayment.shopId = null;
      state.upFrontPayment.payment = null;
    },
    clearInitialSubscriptionPayment: (state) => {
      state.initialSubscriptionPayment.loading = false;
      state.initialSubscriptionPayment.error = null;
      state.initialSubscriptionPayment.success = false;
      state.initialSubscriptionPayment.shopId = null;
      state.initialSubscriptionPayment.shopStatus = null;
      state.initialSubscriptionPayment.subscriptionType = null;
      state.initialSubscriptionPayment.payment = null;
    },
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
    builder.addCase(fetchUpFrontPayment_Service.pending, (state) => {
      state.upFrontPayment.loading = true;
      state.upFrontPayment.error = null;
      state.upFrontPayment.success = false;
    });
    builder.addCase(fetchUpFrontPayment_Service.fulfilled, (state, action) => {
      state.upFrontPayment.loading = false;
      state.upFrontPayment.success = true;
      state.upFrontPayment.error = null;
      state.upFrontPayment.shopId = action.payload.shopId;
      state.upFrontPayment.payment = action.payload.payment;
    });
    builder.addCase(fetchUpFrontPayment_Service.rejected, (state, action) => {
      state.upFrontPayment.loading = false;
      state.upFrontPayment.success = false;
      state.upFrontPayment.payment = null;
      state.upFrontPayment.shopId = null;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.upFrontPayment.error =
        payload?.message || action.error.message || 'Could not load up-front payment';
    });

    builder.addCase(fetchInitialSubscriptionPayment_Service.pending, (state) => {
      state.initialSubscriptionPayment.loading = true;
      state.initialSubscriptionPayment.error = null;
      state.initialSubscriptionPayment.success = false;
    });
    builder.addCase(fetchInitialSubscriptionPayment_Service.fulfilled, (state, action) => {
      state.initialSubscriptionPayment.loading = false;
      state.initialSubscriptionPayment.success = true;
      state.initialSubscriptionPayment.error = null;
      state.initialSubscriptionPayment.shopId = action.payload.shopId;
      state.initialSubscriptionPayment.shopStatus = action.payload.shopStatus;
      state.initialSubscriptionPayment.subscriptionType = action.payload.subscriptionType;
      state.initialSubscriptionPayment.payment = action.payload.payment;
    });
    builder.addCase(fetchInitialSubscriptionPayment_Service.rejected, (state, action) => {
      state.initialSubscriptionPayment.loading = false;
      state.initialSubscriptionPayment.success = false;
      state.initialSubscriptionPayment.payment = null;
      state.initialSubscriptionPayment.shopId = null;
      state.initialSubscriptionPayment.shopStatus = null;
      state.initialSubscriptionPayment.subscriptionType = null;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.initialSubscriptionPayment.error =
        payload?.message ||
        action.error.message ||
        'Could not load initial subscription payment';
    });

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
      if (state.upFrontPayment.payment?._id === updatedPayment._id) {
        state.upFrontPayment.payment = updatedPayment;
      }
      if (state.initialSubscriptionPayment.payment?._id === updatedPayment._id) {
        state.initialSubscriptionPayment.payment = updatedPayment;
      }
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

export const {
  clearUpFrontPayment,
  clearInitialSubscriptionPayment,
  clearShopPayments,
  clearPaymentSubmit,
} = PaymentSlice.actions;

export default PaymentSlice.reducer;
