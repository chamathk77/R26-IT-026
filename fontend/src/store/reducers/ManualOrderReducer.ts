import { createSlice } from '@reduxjs/toolkit';
import { clearLoginSession } from './AuthReducer';
import {
  acceptManualOrder_Service,
  fetchBranchOrderQr_Service,
  fetchManualOrderCount_Service,
  fetchManualOrders_Service,
  rejectManualOrder_Service,
} from '../../services/ManualOrderService';
import { BranchOrderQr, ManualOrder } from '../../type/manualOrder';
import { ApiErrorResponse } from '../../type/common';

interface ManualOrderState {
  list: {
    loading: boolean;
    error: string | null;
    items: ManualOrder[];
    shopId: string | null;
    branchId: string | null;
  };
  /** Home screen badge — kept separate so the poll never disturbs the list. */
  pendingCount: {
    loading: boolean;
    error: string | null;
    count: number;
  };
  review: {
    loadingSessionId: string | null;
    error: string | null;
  };
  branchQr: {
    loading: boolean;
    error: string | null;
    data: BranchOrderQr | null;
  };
}

const initialState: ManualOrderState = {
  list: {
    loading: false,
    error: null,
    items: [],
    shopId: null,
    branchId: null,
  },
  pendingCount: {
    loading: false,
    error: null,
    count: 0,
  },
  review: {
    loadingSessionId: null,
    error: null,
  },
  branchQr: {
    loading: false,
    error: null,
    data: null,
  },
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as ApiErrorResponse).message ?? fallback);
  }
  return fallback;
}

const ManualOrderReducer = createSlice({
  name: 'ManualOrderReducer',
  initialState,
  reducers: {
    clearManualOrders: (state) => {
      state.list = initialState.list;
      state.pendingCount = initialState.pendingCount;
      state.review = initialState.review;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(clearLoginSession, () => initialState);

    builder.addCase(fetchManualOrders_Service.pending, (state) => {
      state.list.loading = true;
      state.list.error = null;
    });
    builder.addCase(fetchManualOrders_Service.fulfilled, (state, action) => {
      state.list.loading = false;
      state.list.error = null;
      state.list.items = Array.isArray(action.payload.data) ? action.payload.data : [];
      state.list.shopId = action.payload.shopId ?? null;
      state.list.branchId = action.payload.branchId ?? null;
      state.pendingCount.count = state.list.items.length;
    });
    builder.addCase(fetchManualOrders_Service.rejected, (state, action) => {
      state.list.loading = false;
      state.list.error = getErrorMessage(action.payload, 'Could not load manual orders');
    });

    builder.addCase(fetchManualOrderCount_Service.pending, (state) => {
      state.pendingCount.loading = true;
    });
    builder.addCase(fetchManualOrderCount_Service.fulfilled, (state, action) => {
      state.pendingCount.loading = false;
      state.pendingCount.error = null;
      state.pendingCount.count = Number(action.payload) || 0;
    });
    builder.addCase(fetchManualOrderCount_Service.rejected, (state, action) => {
      state.pendingCount.loading = false;
      state.pendingCount.error = getErrorMessage(
        action.payload,
        'Could not load manual order count',
      );
    });

    builder.addCase(acceptManualOrder_Service.pending, (state, action) => {
      state.review.loadingSessionId = action.meta.arg;
      state.review.error = null;
    });
    builder.addCase(acceptManualOrder_Service.fulfilled, (state) => {
      state.review.loadingSessionId = null;
      state.review.error = null;
    });
    builder.addCase(acceptManualOrder_Service.rejected, (state, action) => {
      state.review.loadingSessionId = null;
      state.review.error = getErrorMessage(action.payload, 'Could not accept the manual order');
    });

    builder.addCase(rejectManualOrder_Service.pending, (state, action) => {
      state.review.loadingSessionId = action.meta.arg;
      state.review.error = null;
    });
    builder.addCase(rejectManualOrder_Service.fulfilled, (state) => {
      state.review.loadingSessionId = null;
      state.review.error = null;
    });
    builder.addCase(rejectManualOrder_Service.rejected, (state, action) => {
      state.review.loadingSessionId = null;
      state.review.error = getErrorMessage(action.payload, 'Could not reject the manual order');
    });

    builder.addCase(fetchBranchOrderQr_Service.pending, (state) => {
      state.branchQr.loading = true;
      state.branchQr.error = null;
    });
    builder.addCase(fetchBranchOrderQr_Service.fulfilled, (state, action) => {
      state.branchQr.loading = false;
      state.branchQr.error = null;
      state.branchQr.data = action.payload;
    });
    builder.addCase(fetchBranchOrderQr_Service.rejected, (state, action) => {
      state.branchQr.loading = false;
      state.branchQr.data = null;
      state.branchQr.error = getErrorMessage(action.payload, 'Could not load the branch QR code');
    });
  },
});

export const { clearManualOrders } = ManualOrderReducer.actions;
export default ManualOrderReducer.reducer;
