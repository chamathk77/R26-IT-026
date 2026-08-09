import { createSlice } from '@reduxjs/toolkit';
import {
  createShopUser_Service,
  deleteShopUser_Service,
  fetchShopUsers_Service,
  updateShopUser_Service,
} from '../../services/ManageUsersService';
import { ShopUser } from '../../type/manageUser';
import { ApiErrorResponse } from '../../type/common';

interface ManageUsersState {
  list: {
    loading: boolean;
    error: string | null;
    success: boolean;
    count: number;
    items: ShopUser[];
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

const initialState: ManageUsersState = {
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

export const ManageUsersSlice = createSlice({
  name: 'ManageUsers',
  initialState,
  reducers: {
    resetManageUsersCreate: (state) => {
      state.create = initialState.create;
    },
    resetManageUsersUpdate: (state) => {
      state.update = initialState.update;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchShopUsers_Service.pending, (state) => {
      state.list.loading = true;
      state.list.error = null;
      state.list.success = false;
    });
    builder.addCase(fetchShopUsers_Service.fulfilled, (state, action) => {
      state.list.loading = false;
      state.list.success = true;
      state.list.error = null;
      state.list.count = action.payload.count ?? 0;
      state.list.items = Array.isArray(action.payload?.data) ? action.payload.data : [];
    });
    builder.addCase(fetchShopUsers_Service.rejected, (state, action) => {
      state.list.loading = false;
      state.list.success = false;
      state.list.count = 0;
      state.list.items = [];
      const payload = action.payload as ApiErrorResponse | undefined;
      state.list.error =
        payload?.message || action.error.message || 'Could not load shop users';
    });

    builder.addCase(createShopUser_Service.pending, (state) => {
      state.create.loading = true;
      state.create.error = null;
      state.create.success = false;
    });
    builder.addCase(createShopUser_Service.fulfilled, (state) => {
      state.create.loading = false;
      state.create.success = true;
      state.create.error = null;
    });
    builder.addCase(createShopUser_Service.rejected, (state, action) => {
      state.create.loading = false;
      state.create.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.create.error =
        payload?.message || action.error.message || 'Could not create user';
    });

    builder.addCase(updateShopUser_Service.pending, (state) => {
      state.update.loading = true;
      state.update.error = null;
      state.update.success = false;
    });
    builder.addCase(updateShopUser_Service.fulfilled, (state, action) => {
      state.update.loading = false;
      state.update.success = true;
      state.update.error = null;
      const updated = action.payload?.data;
      if (updated?._id) {
        state.list.items = state.list.items.map((user) =>
          user._id === updated._id ? { ...user, ...updated } : user,
        );
      }
    });
    builder.addCase(updateShopUser_Service.rejected, (state, action) => {
      state.update.loading = false;
      state.update.success = false;
      const payload = action.payload as ApiErrorResponse | undefined;
      state.update.error =
        payload?.message || action.error.message || 'Could not update user';
    });

    builder.addCase(deleteShopUser_Service.fulfilled, (state, action) => {
      const id = String(action.payload.id);
      state.list.items = state.list.items.filter((user) => String(user._id) !== id);
      state.list.count = state.list.items.length;
    });
  },
});

export const { resetManageUsersCreate, resetManageUsersUpdate } = ManageUsersSlice.actions;

export default ManageUsersSlice.reducer;
