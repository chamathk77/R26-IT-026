import { createSlice } from '@reduxjs/toolkit';
import { fetchAnalyticsOverview_Service } from '../../services/AnalyticsService';
import { AnalyticsOverviewData } from '../../type/analytics';
import { ApiErrorResponse } from '../../type/common';

interface AnalyticsState {
  overview: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: AnalyticsOverviewData | null;
  };
}

const initialState: AnalyticsState = {
  overview: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
};

export const AnalyticsSlice = createSlice({
  name: 'Analytics',
  initialState,
  reducers: {
    resetAnalyticsOverview: (state) => {
      state.overview = initialState.overview;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAnalyticsOverview_Service.pending, (state) => {
      state.overview.loading = true;
      state.overview.error = null;
      state.overview.success = false;
    });
    builder.addCase(fetchAnalyticsOverview_Service.fulfilled, (state, action) => {
      state.overview.loading = false;
      state.overview.success = true;
      state.overview.error = null;
      state.overview.data = action.payload.data ?? null;
    });
    builder.addCase(fetchAnalyticsOverview_Service.rejected, (state, action) => {
      state.overview.loading = false;
      state.overview.success = false;
      state.overview.data = null;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.overview.error =
        payload?.message || action.error.message || 'Could not load analytics overview';
    });
  },
});

export const { resetAnalyticsOverview } = AnalyticsSlice.actions;

export default AnalyticsSlice.reducer;
