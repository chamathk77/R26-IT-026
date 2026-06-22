import { createSlice } from '@reduxjs/toolkit';
import {
  assignKpiHistorySalesPerson_Service,
  fetchKpiHistoryByOrderId_Service,
  fetchKpiSummary_Service,
} from '../../services/KpiService';
import { KpiHistoryRecord, KpiSummaryData } from '../../type/kpi';
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
  },
});

export const { resetKpiSummary, resetKpiHistoryDetail, resetKpiAssignSalesPerson } =
  KpiSlice.actions;

export default KpiSlice.reducer;
