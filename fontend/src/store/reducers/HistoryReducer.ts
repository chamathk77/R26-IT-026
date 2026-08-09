import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchHistory_Service, resendBillSms_Service } from '../../services/HistoryService';
import { HistoryFilters, HistoryRecord, HistoryScope } from '../../type/history';

export interface HistoryFilterState {
  from: string;
  to: string;
  paymentOption: HistoryFilters['paymentOption'];
  orderId: string;
  mobile: string;
}

interface HistoryState {
  scope: HistoryScope;
  filters: HistoryFilterState;
  list: {
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    items: HistoryRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    } | null;
  };
}

const initialFilters: HistoryFilterState = {
  from: '',
  to: '',
  paymentOption: '',
  orderId: '',
  mobile: '',
};

const initialState: HistoryState = {
  scope: 'all',
  filters: initialFilters,
  list: {
    loading: false,
    loadingMore: false,
    error: null,
    items: [],
    pagination: null,
  },
};

export const HistorySlice = createSlice({
  name: 'History',
  initialState,
  reducers: {
    setHistoryScope: (state, action: PayloadAction<HistoryScope>) => {
      state.scope = action.payload;
    },
    setHistoryFilters: (state, action: PayloadAction<Partial<HistoryFilterState>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetHistoryFilters: (state) => {
      state.filters = initialFilters;
    },
    applyHistoryFilters: (state, action: PayloadAction<HistoryFilterState>) => {
      state.filters = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchHistory_Service.pending, (state, action) => {
      const append = Boolean(action.meta.arg?.append);
      if (append) {
        state.list.loadingMore = true;
      } else {
        state.list.loading = true;
      }
      state.list.error = null;
    });
    builder.addCase(fetchHistory_Service.fulfilled, (state, action) => {
      state.list.loading = false;
      state.list.loadingMore = false;
      state.list.error = null;
      state.scope = action.payload.scope ?? state.scope;

      const nextItems = Array.isArray(action.payload?.data) ? action.payload.data : [];
      state.list.items = action.payload.append
        ? [...state.list.items, ...nextItems]
        : nextItems;
      state.list.pagination = action.payload.pagination ?? null;
    });
    builder.addCase(fetchHistory_Service.rejected, (state, action) => {
      state.list.loading = false;
      state.list.loadingMore = false;
      const payload = action.payload as { message?: string } | undefined;
      state.list.error =
        payload?.message || action.error.message || 'Could not load history';
    });

    builder.addCase(resendBillSms_Service.fulfilled, (state, action) => {
      const updated = action.payload?.data;
      if (!updated?._id) return;
      state.list.items = state.list.items.map((item) =>
        item._id === updated._id ? { ...item, ...updated } : item,
      );
    });
  },
});

export const { setHistoryScope, setHistoryFilters, resetHistoryFilters, applyHistoryFilters } =
  HistorySlice.actions;

export default HistorySlice.reducer;
