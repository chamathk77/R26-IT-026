import { createSlice } from '@reduxjs/toolkit';
import { createCostExpense_Service } from '../../services/CostExpenseService';
import { ApiErrorResponse } from '../../type/common';

interface CostExpenseState {
  create: {
    loading: boolean;
    error: string | null;
    success: boolean;
  };
}

const initialState: CostExpenseState = {
  create: {
    loading: false,
    error: null,
    success: false,
  },
};

export const CostExpenseSlice = createSlice({
  name: 'CostExpense',
  initialState,
  reducers: {
    resetCostExpenseCreate: (state) => {
      state.create = initialState.create;
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
  },
});

export const { resetCostExpenseCreate } = CostExpenseSlice.actions;

export default CostExpenseSlice.reducer;
