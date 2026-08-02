import { createSlice } from '@reduxjs/toolkit';
import {
  createSalePerson_Service,
  deleteSalePerson_Service,
  fetchSalePersonById_Service,
  fetchSalePersons_Service,
  fetchSalePersonsForLoggedUserBranch_Service,
  updateSalePerson_Service,
} from '../../services/SalePersonService';
import { SalePerson } from '../../type/salePerson';
import { ApiErrorResponse } from '../../type/common';

interface SalePersonState {
  list: {
    loading: boolean;
    error: string | null;
    success: boolean;
    count: number;
    items: SalePerson[];
  };
  branchList: {
    loading: boolean;
    error: string | null;
    success: boolean;
    count: number;
    branchId: string | null;
    items: SalePerson[];
  };
  detail: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: SalePerson | null;
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

const initialState: SalePersonState = {
  list: {
    loading: false,
    error: null,
    success: false,
    count: 0,
    items: [],
  },
  branchList: {
    loading: false,
    error: null,
    success: false,
    count: 0,
    branchId: null,
    items: [],
  },
  detail: {
    loading: false,
    error: null,
    success: false,
    data: null,
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

export const SalePersonSlice = createSlice({
  name: 'SalePerson',
  initialState,
  reducers: {
    resetSalePersonDetail: (state) => {
      state.detail = initialState.detail;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchSalePersons_Service.pending, (state) => {
      state.list.loading = true;
      state.list.error = null;
      state.list.success = false;
    });
    builder.addCase(fetchSalePersons_Service.fulfilled, (state, action) => {
      state.list.loading = false;
      state.list.success = true;
      state.list.error = null;
      state.list.count = action.payload.count ?? 0;
      state.list.items = Array.isArray(action.payload?.data) ? action.payload.data : [];
    });
    builder.addCase(fetchSalePersons_Service.rejected, (state, action) => {
      state.list.loading = false;
      state.list.success = false;
      state.list.count = 0;
      state.list.items = [];
      const payload = action.payload as ApiErrorResponse | undefined;
      state.list.error =
        payload?.message || action.error.message || 'Could not load sales persons';
    });

    builder.addCase(fetchSalePersonsForLoggedUserBranch_Service.pending, (state) => {
      state.branchList.loading = true;
      state.branchList.error = null;
      state.branchList.success = false;
    });
    builder.addCase(fetchSalePersonsForLoggedUserBranch_Service.fulfilled, (state, action) => {
      state.branchList.loading = false;
      state.branchList.success = true;
      state.branchList.error = null;
      state.branchList.count = action.payload.count ?? 0;
      state.branchList.branchId = action.payload.branchId ?? null;
      state.branchList.items = Array.isArray(action.payload?.data) ? action.payload.data : [];
    });
    builder.addCase(fetchSalePersonsForLoggedUserBranch_Service.rejected, (state, action) => {
      state.branchList.loading = false;
      state.branchList.success = false;
      state.branchList.count = 0;
      state.branchList.branchId = null;
      state.branchList.items = [];
      const payload = action.payload as ApiErrorResponse | undefined;
      state.branchList.error =
        payload?.message ||
        action.error.message ||
        'Could not load sales persons for this branch';
    });

    builder.addCase(fetchSalePersonById_Service.pending, (state) => {
      state.detail.loading = true;
      state.detail.error = null;
      state.detail.success = false;
      state.detail.data = null;
    });
    builder.addCase(fetchSalePersonById_Service.fulfilled, (state, action) => {
      state.detail.loading = false;
      state.detail.success = true;
      state.detail.error = null;
      state.detail.data = action.payload.data ?? null;
    });
    builder.addCase(fetchSalePersonById_Service.rejected, (state, action) => {
      state.detail.loading = false;
      state.detail.success = false;
      state.detail.data = null;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.detail.error =
        payload?.message || action.error.message || 'Could not load sales person';
    });

    builder.addCase(createSalePerson_Service.pending, (state) => {
      state.create.loading = true;
      state.create.error = null;
      state.create.success = false;
    });
    builder.addCase(createSalePerson_Service.fulfilled, (state, action) => {
      state.create.loading = false;
      state.create.success = true;
      state.create.error = null;
      const created = action.payload?.data;
      if (created?._id) {
        state.list.items = [created, ...state.list.items];
        state.list.count = state.list.items.length;
      }
    });
    builder.addCase(createSalePerson_Service.rejected, (state, action) => {
      state.create.loading = false;
      state.create.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.create.error =
        payload?.message || action.error.message || 'Could not create sales person';
    });

    builder.addCase(updateSalePerson_Service.pending, (state) => {
      state.update.loading = true;
      state.update.error = null;
      state.update.success = false;
    });
    builder.addCase(updateSalePerson_Service.fulfilled, (state, action) => {
      state.update.loading = false;
      state.update.success = true;
      state.update.error = null;
      const updated = action.payload?.data;
      if (updated?._id) {
        state.list.items = state.list.items.map((person) =>
          person._id === updated._id ? { ...person, ...updated } : person,
        );
        state.detail.data = updated;
      }
    });
    builder.addCase(updateSalePerson_Service.rejected, (state, action) => {
      state.update.loading = false;
      state.update.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.update.error =
        payload?.message || action.error.message || 'Could not update sales person';
    });

    builder.addCase(deleteSalePerson_Service.fulfilled, (state, action) => {
      const id = String(action.payload.id);
      state.list.items = state.list.items.filter((person) => String(person._id) !== id);
      state.list.count = state.list.items.length;
    });
    builder.addCase(deleteSalePerson_Service.rejected, (state, action) => {
      const payload = action.payload as ApiErrorResponse | undefined;
      state.list.error =
        payload?.message || action.error.message || 'Could not delete sales person';
    });
  },
});

export const { resetSalePersonDetail } = SalePersonSlice.actions;

export default SalePersonSlice.reducer;
