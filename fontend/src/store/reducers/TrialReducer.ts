import { createSlice } from '@reduxjs/toolkit';
import { startTrial_Service, skipTrial_Service } from '../../services/TrialService';
import { StartTrialResponse, SkipTrialResponse } from '../../type/trial';
import { ApiErrorResponse } from '../../type/common';

interface TrialState {
  startTrial: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: StartTrialResponse | null;
  };
  skipTrial: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: SkipTrialResponse | null;
  };
}

const initialState: TrialState = {
  startTrial: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
  skipTrial: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
};

export const TrialSlice = createSlice({
  name: 'Trial',
  initialState,
  reducers: {
    clearStartTrial: (state) => {
      state.startTrial.loading = false;
      state.startTrial.error = null;
      state.startTrial.success = false;
      state.startTrial.data = null;
    },
    clearSkipTrial: (state) => {
      state.skipTrial.loading = false;
      state.skipTrial.error = null;
      state.skipTrial.success = false;
      state.skipTrial.data = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(startTrial_Service.pending, (state) => {
      state.startTrial.loading = true;
      state.startTrial.error = null;
      state.startTrial.success = false;
      state.startTrial.data = null;
    });
    builder.addCase(startTrial_Service.fulfilled, (state, action) => {
      state.startTrial.loading = false;
      state.startTrial.success = true;
      state.startTrial.error = null;
      state.startTrial.data = action.payload;
    });
    builder.addCase(startTrial_Service.rejected, (state, action) => {
      state.startTrial.loading = false;
      state.startTrial.success = false;
      state.startTrial.data = null;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.startTrial.error =
        payload?.message || action.error.message || 'Could not start trial';
    });

    builder.addCase(skipTrial_Service.pending, (state) => {
      state.skipTrial.loading = true;
      state.skipTrial.error = null;
      state.skipTrial.success = false;
      state.skipTrial.data = null;
    });
    builder.addCase(skipTrial_Service.fulfilled, (state, action) => {
      state.skipTrial.loading = false;
      state.skipTrial.success = true;
      state.skipTrial.error = null;
      state.skipTrial.data = action.payload;
    });
    builder.addCase(skipTrial_Service.rejected, (state, action) => {
      state.skipTrial.loading = false;
      state.skipTrial.success = false;
      state.skipTrial.data = null;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.skipTrial.error =
        payload?.message || action.error.message || 'Could not skip trial';
    });
  },
});

export const { clearStartTrial, clearSkipTrial } = TrialSlice.actions;

export default TrialSlice.reducer;
