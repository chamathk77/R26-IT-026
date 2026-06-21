import { createSlice } from '@reduxjs/toolkit';
import { fetchKpiSummary_Service } from '../../services/KpiService';
import { KpiSummaryData } from '../../type/kpi';
import { ApiErrorResponse } from '../../type/common';

interface KpiState {
  summary: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: KpiSummaryData | null;
  };
}

const initialState: KpiState = {
  summary: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
};

export const KpiSlice = createSlice({
  name: 'Kpi',
  initialState,
  reducers: {
    resetKpiSummary: (state) => {
      state.summary = initialState.summary;
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
  },
});

export const { resetKpiSummary } = KpiSlice.actions;

export default KpiSlice.reducer;
