import { createSlice } from '@reduxjs/toolkit';
import {
  createCostExpense_Service,
  fetchCostExpenseById_Service,
  fetchCostHistory_Service,
} from '../../services/CostExpenseService';
import { CostExpense, CostHistoryPagination } from '../../type/costExpense';
import { ApiErrorResponse } from '../../type/common';

interface CostExpenseState {
  create: {
    loading: boolean;
    error: string | null;
    success: boolean;
  };
  history: {
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    success: boolean;
    items: CostExpense[];
    pagination: CostHistoryPagination | null;
  };
  detail: {
    loadingId: string | null;
    error: string | null;
    byId: Record<string, CostExpense>;
  };
}

const initialState: CostExpenseState = {
  create: {
    loading: false,
    error: null,
    success: false,
  },
  history: {
    loading: false,
    loadingMore: false,
    error: null,
    success: false,
    items: [],
    pagination: null,
  },
  detail: {
    loadingId: null,
    error: null,
    byId: {},
  },
};

export const CostExpenseSlice = createSlice({
  name: 'CostExpense',
  initialState,
  reducers: {
    resetCostExpenseCreate: (state) => {
      state.create = initialState.create;
    },
    resetCostExpenseHistory: (state) => {
      state.history = initialState.history;
    },
    clearCostExpenseDetail: (state) => {
      state.detail = initialState.detail;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createCostExpense_Service.pending, (state) => {
      state.create.loading = true;
      state.create.error = null;
      state.create.success = false;
    });
    builder.addCase(createCostExpense_Service.fulfilled, (state) => {
      state.create.loading = false;
      state.create.success = true;
      state.create.error = null;
    });
    builder.addCase(createCostExpense_Service.rejected, (state, action) => {
      state.create.loading = false;
      state.create.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.create.error =
        payload?.message || action.error.message || 'Could not create expense';
    });

    builder.addCase(fetchCostHistory_Service.pending, (state, action) => {
      if (action.meta.arg.append) {
        state.history.loadingMore = true;
      } else {
        state.history.loading = true;
      }
      state.history.error = null;
      state.history.success = false;
    });
    builder.addCase(fetchCostHistory_Service.fulfilled, (state, action) => {
      state.history.loading = false;
      state.history.loadingMore = false;
      state.history.success = true;
      state.history.error = null;
      state.history.pagination = action.payload.pagination ?? null;

      const nextItems = Array.isArray(action.payload?.data) ? action.payload.data : [];
      if (action.meta.arg.append) {
        state.history.items = [...state.history.items, ...nextItems];
      } else {
        state.history.items = nextItems;
      }
    });
    builder.addCase(fetchCostHistory_Service.rejected, (state, action) => {
      state.history.loading = false;
      state.history.loadingMore = false;
      state.history.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.history.error =
        payload?.message || action.error.message || 'Could not load expense history';
      if (!action.meta.arg.append) {
        state.history.items = [];
        state.history.pagination = null;
      }
    });

    builder.addCase(fetchCostExpenseById_Service.pending, (state, action) => {
      state.detail.loadingId = action.meta.arg;
      state.detail.error = null;
    });
    builder.addCase(fetchCostExpenseById_Service.fulfilled, (state, action) => {
      state.detail.loadingId = null;
      state.detail.error = null;
      const expense = action.payload?.data;
      if (expense?._id) {
        state.detail.byId[expense._id] = expense;
      }
    });
    builder.addCase(fetchCostExpenseById_Service.rejected, (state, action) => {
      state.detail.loadingId = null;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.detail.error =
        payload?.message || action.error.message || 'Could not load expense details';
    });
  },
});

export const { resetCostExpenseCreate, resetCostExpenseHistory, clearCostExpenseDetail } =
  CostExpenseSlice.actions;

export default CostExpenseSlice.reducer;
