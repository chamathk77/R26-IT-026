import { createSlice } from '@reduxjs/toolkit';
import {
  assignKpiHistorySalesPerson_Service,
  fetchKpiHistoryByOrderId_Service,
  fetchKpiHistorySummary_Service,
  fetchKpiSummary_Service,
} from '../../services/KpiService';
import {
  KpiHistoryRecord,
  KpiHistorySummaryFilters,
  KpiHistorySummaryPagination,
  KpiHistorySummaryStats,
  KpiSummaryData,
} from '../../type/kpi';
import { ApiErrorResponse } from '../../type/common';

interface KpiState {
  summary: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: KpiSummaryData | null;
  };
  historyDetail: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: KpiHistoryRecord | null;
  };
  assignSalesPerson: {
    loading: boolean;
    error: string | null;
    success: boolean;
  };
  historySummary: {
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    success: boolean;
    items: KpiHistoryRecord[];
    filters: KpiHistorySummaryFilters | null;
    summary: KpiHistorySummaryStats | null;
    pagination: KpiHistorySummaryPagination | null;
  };
}

const initialState: KpiState = {
  summary: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
  historyDetail: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
  assignSalesPerson: {
    loading: false,
    error: null,
    success: false,
  },
  historySummary: {
    loading: false,
    loadingMore: false,
    error: null,
    success: false,
    items: [],
    filters: null,
    summary: null,
    pagination: null,
  },
};

export const KpiSlice = createSlice({
  name: 'Kpi',
  initialState,
  reducers: {
    resetKpiSummary: (state) => {
      state.summary = initialState.summary;
    },
    resetKpiHistoryDetail: (state) => {
      state.historyDetail = initialState.historyDetail;
    },
    resetKpiAssignSalesPerson: (state) => {
      state.assignSalesPerson = initialState.assignSalesPerson;
    },
    resetKpiHistorySummary: (state) => {
      state.historySummary = initialState.historySummary;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchKpiSummary_Service.pending, (state) => {
      state.summary.loading = true;
      state.summary.error = null;
      state.summary.success = false;
    });
    builder.addCase(fetchKpiSummary_Service.fulfilled, (state, action) => {
      state.summary.loading = false;
      state.summary.success = true;
      state.summary.error = null;
      state.summary.data = action.payload.data ?? null;
    });
    builder.addCase(fetchKpiSummary_Service.rejected, (state, action) => {
      state.summary.loading = false;
      state.summary.success = false;
      state.summary.data = null;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.summary.error =
        payload?.message || action.error.message || 'Could not load KPI summary';
    });

    builder.addCase(fetchKpiHistoryByOrderId_Service.pending, (state) => {
      state.historyDetail.loading = true;
      state.historyDetail.error = null;
      state.historyDetail.success = false;
    });
    builder.addCase(fetchKpiHistoryByOrderId_Service.fulfilled, (state, action) => {
      state.historyDetail.loading = false;
      state.historyDetail.success = true;
      state.historyDetail.error = null;
      state.historyDetail.data = action.payload.data ?? null;
    });
    builder.addCase(fetchKpiHistoryByOrderId_Service.rejected, (state, action) => {
      state.historyDetail.loading = false;
      state.historyDetail.success = false;
      state.historyDetail.data = null;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.historyDetail.error =
        payload?.message || action.error.message || 'Could not load order details';
    });

    builder.addCase(assignKpiHistorySalesPerson_Service.pending, (state) => {
      state.assignSalesPerson.loading = true;
      state.assignSalesPerson.error = null;
      state.assignSalesPerson.success = false;
    });
    builder.addCase(assignKpiHistorySalesPerson_Service.fulfilled, (state) => {
      state.assignSalesPerson.loading = false;
      state.assignSalesPerson.success = true;
      state.assignSalesPerson.error = null;
    });
    builder.addCase(assignKpiHistorySalesPerson_Service.rejected, (state, action) => {
      state.assignSalesPerson.loading = false;
      state.assignSalesPerson.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.assignSalesPerson.error =
        payload?.message || action.error.message || 'Could not assign sales person';
    });

    builder.addCase(fetchKpiHistorySummary_Service.pending, (state, action) => {
      if (action.meta.arg.append) {
        state.historySummary.loadingMore = true;
      } else {
        state.historySummary.loading = true;
      }
      state.historySummary.error = null;
      state.historySummary.success = false;
    });
    builder.addCase(fetchKpiHistorySummary_Service.fulfilled, (state, action) => {
      state.historySummary.loading = false;
      state.historySummary.loadingMore = false;
      state.historySummary.success = true;
      state.historySummary.error = null;
      state.historySummary.filters = action.payload.filters ?? null;
      state.historySummary.summary = action.payload.summary ?? null;
      state.historySummary.pagination = action.payload.pagination ?? null;

      const nextItems = Array.isArray(action.payload.data) ? action.payload.data : [];
      if (action.meta.arg.append) {
        state.historySummary.items = [...state.historySummary.items, ...nextItems];
      } else {
        state.historySummary.items = nextItems;
      }
    });
    builder.addCase(fetchKpiHistorySummary_Service.rejected, (state, action) => {
      state.historySummary.loading = false;
      state.historySummary.loadingMore = false;
      state.historySummary.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.historySummary.error =
        payload?.message || action.error.message || 'Could not load KPI history summary';
      if (!action.meta.arg.append) {
        state.historySummary.items = [];
        state.historySummary.filters = null;
        state.historySummary.summary = null;
        state.historySummary.pagination = null;
      }
    });
  },
});

export const {
  resetKpiSummary,
  resetKpiHistoryDetail,
  resetKpiAssignSalesPerson,
  resetKpiHistorySummary,
} = KpiSlice.actions;

export default KpiSlice.reducer;
