import { createSlice } from '@reduxjs/toolkit';
import {
  createCostExpense_Service,
  deleteCostExpense_Service,
  fetchCostExpenseById_Service,
  fetchCostHistory_Service,
  fetchCostOverview_Service,
  fetchCostSummary_Service,
  updateCostExpense_Service,
} from '../../services/CostExpenseService';
import {
  CostExpense,
  CostHistoryPagination,
  CostOverviewData,
  CostSummaryData,
} from '../../type/costExpense';
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
    updating: boolean;
    deleting: boolean;
    error: string | null;
    byId: Record<string, CostExpense>;
  };
  overview: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: CostOverviewData | null;
  };
  summary: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: CostSummaryData | null;
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
    updating: false,
    deleting: false,
    error: null,
    byId: {},
  },
  overview: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
  summary: {
    loading: false,
    error: null,
    success: false,
    data: null,
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
      state.overview.success = false;
      state.summary.success = false;
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

    builder.addCase(updateCostExpense_Service.pending, (state) => {
      state.detail.updating = true;
      state.detail.error = null;
    });
    builder.addCase(updateCostExpense_Service.fulfilled, (state, action) => {
      state.detail.updating = false;
      state.detail.error = null;
      state.overview.success = false;
      state.summary.success = false;
      const expense = action.payload?.data;
      if (expense?._id) {
        state.detail.byId[expense._id] = expense;
        state.history.items = state.history.items.map((item) =>
          item._id === expense._id ? expense : item,
        );
      }
    });
    builder.addCase(updateCostExpense_Service.rejected, (state, action) => {
      state.detail.updating = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.detail.error =
        payload?.message || action.error.message || 'Could not update expense';
    });

    builder.addCase(deleteCostExpense_Service.pending, (state) => {
      state.detail.deleting = true;
      state.detail.error = null;
    });
    builder.addCase(deleteCostExpense_Service.fulfilled, (state, action) => {
      state.detail.deleting = false;
      state.detail.error = null;
      state.overview.success = false;
      state.summary.success = false;
      const deletedId = action.payload?.id;
      if (deletedId) {
        delete state.detail.byId[deletedId];
        state.history.items = state.history.items.filter((item) => item._id !== deletedId);
        if (state.history.pagination) {
          state.history.pagination.total = Math.max(0, state.history.pagination.total - 1);
        }
      }
    });
    builder.addCase(deleteCostExpense_Service.rejected, (state, action) => {
      state.detail.deleting = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.detail.error =
        payload?.message || action.error.message || 'Could not delete expense';
    });

    builder.addCase(fetchCostOverview_Service.pending, (state) => {
      state.overview.loading = true;
      state.overview.error = null;
      state.overview.success = false;
    });
    builder.addCase(fetchCostOverview_Service.fulfilled, (state, action) => {
      state.overview.loading = false;
      state.overview.success = true;
      state.overview.error = null;
      state.overview.data = action.payload?.data ?? null;
    });
    builder.addCase(fetchCostOverview_Service.rejected, (state, action) => {
      state.overview.loading = false;
      state.overview.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.overview.error =
        payload?.message || action.error.message || 'Could not load cost overview';
    });

    builder.addCase(fetchCostSummary_Service.pending, (state) => {
      state.summary.loading = true;
      state.summary.error = null;
      state.summary.success = false;
    });
    builder.addCase(fetchCostSummary_Service.fulfilled, (state, action) => {
      state.summary.loading = false;
      state.summary.success = true;
      state.summary.error = null;
      state.summary.data = action.payload?.data ?? null;
    });
    builder.addCase(fetchCostSummary_Service.rejected, (state, action) => {
      state.summary.loading = false;
      state.summary.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.summary.error =
        payload?.message || action.error.message || 'Could not load cost summary';
    });
  },
});

export const { resetCostExpenseCreate, resetCostExpenseHistory, clearCostExpenseDetail } =
  CostExpenseSlice.actions;

export default CostExpenseSlice.reducer;
