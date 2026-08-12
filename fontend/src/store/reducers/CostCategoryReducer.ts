import { createSlice } from '@reduxjs/toolkit';
import {
  createCostCategory_Service,
  deleteCostCategory_Service,
  fetchCostCategories_Service,
  updateCostCategory_Service,
} from '../../services/CostCategoryService';
import { CostCategory } from '../../type/costCategory';
import { ApiErrorResponse } from '../../type/common';

interface CostCategoryState {
  list: {
    loading: boolean;
    error: string | null;
    success: boolean;
    count: number;
    items: CostCategory[];
  };
  create: {
    loading: boolean;
    error: string | null;
    success: boolean;
  };
  update: {
    loading: boolean;
    error: string | null;
    success: boolean;
  };
}

const initialState: CostCategoryState = {
  list: {
    loading: false,
    error: null,
    success: false,
    count: 0,
    items: [],
  },
  create: {
    loading: false,
    error: null,
    success: false,
  },
  update: {
    loading: false,
    error: null,
    success: false,
  },
};

export const CostCategorySlice = createSlice({
  name: 'CostCategory',
  initialState,
  reducers: {
    resetCostCategoryCreate: (state) => {
      state.create = initialState.create;
    },
    resetCostCategoryUpdate: (state) => {
      state.update = initialState.update;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchCostCategories_Service.pending, (state) => {
      state.list.loading = true;
      state.list.error = null;
      state.list.success = false;
    });
    builder.addCase(fetchCostCategories_Service.fulfilled, (state, action) => {
      state.list.loading = false;
      state.list.success = true;
      state.list.error = null;
      state.list.count = action.payload.count ?? 0;
      state.list.items = Array.isArray(action.payload?.data) ? action.payload.data : [];
    });
    builder.addCase(fetchCostCategories_Service.rejected, (state, action) => {
      state.list.loading = false;
      state.list.success = false;
      state.list.count = 0;
      state.list.items = [];
      const payload = action.payload as ApiErrorResponse | undefined;
      state.list.error =
        payload?.message || action.error.message || 'Could not load cost categories';
    });

    builder.addCase(createCostCategory_Service.pending, (state) => {
      state.create.loading = true;
      state.create.error = null;
      state.create.success = false;
    });
    builder.addCase(createCostCategory_Service.fulfilled, (state, action) => {
      state.create.loading = false;
      state.create.success = true;
      state.create.error = null;
      const created = action.payload?.data;
      if (created?._id) {
        state.list.items = [created, ...state.list.items];
        state.list.count = state.list.items.length;
      }
    });
    builder.addCase(createCostCategory_Service.rejected, (state, action) => {
      state.create.loading = false;
      state.create.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.create.error =
        payload?.message || action.error.message || 'Could not create cost category';
    });

    builder.addCase(updateCostCategory_Service.pending, (state) => {
      state.update.loading = true;
      state.update.error = null;
      state.update.success = false;
    });
    builder.addCase(updateCostCategory_Service.fulfilled, (state, action) => {
      state.update.loading = false;
      state.update.success = true;
      state.update.error = null;
      const updated = action.payload?.data;
      if (updated?._id) {
        state.list.items = state.list.items.map((item) =>
          item._id === updated._id ? { ...item, ...updated } : item,
        );
      }
    });
    builder.addCase(updateCostCategory_Service.rejected, (state, action) => {
      state.update.loading = false;
      state.update.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.update.error =
        payload?.message || action.error.message || 'Could not update cost category';
    });

    builder.addCase(deleteCostCategory_Service.fulfilled, (state, action) => {
      const id = String(action.payload.id);
      state.list.items = state.list.items.filter((item) => String(item._id) !== id);
      state.list.count = state.list.items.length;
    });
    builder.addCase(deleteCostCategory_Service.rejected, (state, action) => {
      const payload = action.payload as ApiErrorResponse | undefined;
      state.list.error =
        payload?.message || action.error.message || 'Could not delete cost category';
    });
  },
});

export const { resetCostCategoryCreate, resetCostCategoryUpdate } = CostCategorySlice.actions;

export default CostCategorySlice.reducer;
