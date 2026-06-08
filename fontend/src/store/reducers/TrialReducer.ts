import { createSlice } from '@reduxjs/toolkit';
import { startTrial_Service } from '../../services/TrialService';
import { StartTrialResponse } from '../../type/trial';
import { ApiErrorResponse } from '../../type/common';

interface TrialState {
  startTrial: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: StartTrialResponse | null;
  };
}

const initialState: TrialState = {
  startTrial: {
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
  },
});

export const { clearStartTrial } = TrialSlice.actions;

export default TrialSlice.reducer;
