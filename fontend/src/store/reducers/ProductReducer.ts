import { createSlice } from '@reduxjs/toolkit';
import {
  createProduct_Service,
  fetchProducts_Service,
  updateProduct_Service,
} from '../../services/ProductService';
import { Product } from '../../type/product';

interface ProductState {
  list: {
    loading: boolean;
    error: string | null;
    items: Product[];
  };
  create: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: ProductMutationPayload | null;
  };
  update: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: ProductMutationPayload | null;
  };
}

type ProductMutationPayload = {
  success: boolean;
  data: Product;
};

const initialState: ProductState = {
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

export const ProductSlice = createSlice({
  name: 'Product',
  initialState,
  reducers: {
    resetCreateProduct: (state) => {
      state.create = initialState.create;
    },
    resetUpdateProduct: (state) => {
      state.update = initialState.update;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchProducts_Service.pending, (state) => {
      state.list.loading = true;
      state.list.error = null;
    });
    builder.addCase(fetchProducts_Service.fulfilled, (state, action) => {
      state.list.loading = false;
      state.list.error = null;
      state.list.items = Array.isArray(action.payload?.data) ? action.payload.data : [];
    });
    builder.addCase(fetchProducts_Service.rejected, (state, action) => {
      state.list.loading = false;
      const payload = action.payload as { message?: string } | undefined;
      state.list.error =
        payload?.message ||
        action.error.message ||
        'Could not load products';
    });

    builder.addCase(createProduct_Service.pending, (state) => {
      state.create.loading = true;
      state.create.error = null;
      state.create.success = false;
      state.create.data = null;
    });
    builder.addCase(createProduct_Service.fulfilled, (state, action) => {
      state.create.loading = false;
      state.create.success = true;
      state.create.error = null;
      state.create.data = action.payload;
      const created = action.payload?.data;
      if (created?._id) {
        state.list.items = [created, ...state.list.items];
      }
    });
    builder.addCase(createProduct_Service.rejected, (state, action) => {
      state.create.loading = false;
      state.create.success = false;
      state.create.data = null;
      const payload = action.payload as { message?: string } | undefined;
      state.create.error =
        payload?.message ||
        action.error.message ||
        'Could not create product';
    });

    builder.addCase(updateProduct_Service.pending, (state) => {
      state.update.loading = true;
      state.update.error = null;
      state.update.success = false;
      state.update.data = null;
    });
    builder.addCase(updateProduct_Service.fulfilled, (state, action) => {
      state.update.loading = false;
      state.update.success = true;
      state.update.error = null;
      state.update.data = action.payload;
      const updated = action.payload?.data;
      if (updated?._id) {
        state.list.items = state.list.items.map((product) =>
          product._id === updated._id ? { ...product, ...updated } : product,
        );
      }
    });
    builder.addCase(updateProduct_Service.rejected, (state, action) => {
      state.update.loading = false;
      state.update.success = false;
      state.update.data = null;
      const payload = action.payload as { message?: string } | undefined;
      state.update.error =
        payload?.message ||
        action.error.message ||
        'Could not update product';
    });
  },
});

export const { resetCreateProduct, resetUpdateProduct } = ProductSlice.actions;

export default ProductSlice.reducer;
