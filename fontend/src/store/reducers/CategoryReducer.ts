import { createSlice } from '@reduxjs/toolkit';
import {
  createCategory_Service,
  deleteCategory_Service,
  fetchCategories_Service,
  updateCategory_Service,
} from '../../services/CategoryService';
import { Category } from '../../type/category';

interface CategoryState {
  list: {
    loading: boolean;
    error: string | null;
    items: Category[];
  };
  create: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: CreateCategoryResponsePayload | null;
  };
  update: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: CreateCategoryResponsePayload | null;
  };
}

type CreateCategoryResponsePayload = {
  success: boolean;
  data: Category;
};

const initialState: CategoryState = {
  list: {
    loading: false,
    error: null,
    items: [],
  },
  create: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
  update: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
};

export const CategorySlice = createSlice({
  name: 'Category',
  initialState,
  reducers: {
    resetCreateCategory: (state) => {
      state.create = initialState.create;
    },
    resetUpdateCategory: (state) => {
      state.update = initialState.update;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchCategories_Service.pending, (state) => {
      state.list.loading = true;
      state.list.error = null;
    });
    builder.addCase(fetchCategories_Service.fulfilled, (state, action) => {
      state.list.loading = false;
      state.list.error = null;
      state.list.items = Array.isArray(action.payload?.data) ? action.payload.data : [];
    });
    builder.addCase(fetchCategories_Service.rejected, (state, action) => {
      state.list.loading = false;
      const payload = action.payload as { message?: string } | undefined;
      state.list.error =
        payload?.message ||
        action.error.message ||
        'Could not load categories';
    });

    builder.addCase(createCategory_Service.pending, (state) => {
      state.create.loading = true;
      state.create.error = null;
      state.create.success = false;
      state.create.data = null;
    });
    builder.addCase(createCategory_Service.fulfilled, (state, action) => {
      state.create.loading = false;
      state.create.success = true;
      state.create.error = null;
      state.create.data = action.payload;
    });
    builder.addCase(createCategory_Service.rejected, (state, action) => {
      state.create.loading = false;
      state.create.success = false;
      state.create.data = null;
      const payload = action.payload as { message?: string } | undefined;
      state.create.error =
        payload?.message ||
        action.error.message ||
        'Could not create category';
    });

    builder.addCase(updateCategory_Service.pending, (state) => {
      state.update.loading = true;
      state.update.error = null;
      state.update.success = false;
      state.update.data = null;
    });
    builder.addCase(updateCategory_Service.fulfilled, (state, action) => {
      state.update.loading = false;
      state.update.success = true;
      state.update.error = null;
      state.update.data = action.payload;
      const updated = action.payload?.data;
      if (updated?._id) {
        state.list.items = state.list.items.map((c) =>
          c._id === updated._id ? { ...c, ...updated } : c,
        );
      }
    });
    builder.addCase(updateCategory_Service.rejected, (state, action) => {
      state.update.loading = false;
      state.update.success = false;
      state.update.data = null;
      const payload = action.payload as { message?: string } | undefined;
      state.update.error =
        payload?.message ||
        action.error.message ||
        'Could not update category';
    });

    builder.addCase(deleteCategory_Service.fulfilled, (state, action) => {
      const id = String(action.payload);
      state.list.items = state.list.items.filter((c) => String(c._id) !== id);
    });
  },
});

export const { resetCreateCategory, resetUpdateCategory } = CategorySlice.actions;

export default CategorySlice.reducer;
