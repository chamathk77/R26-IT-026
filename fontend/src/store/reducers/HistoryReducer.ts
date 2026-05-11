import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchHistory_Service } from '../../services/HistoryService';
import { HistoryRecord, HistoryScope } from '../../type/history';

interface HistoryState {
  scope: HistoryScope;
  list: {
    loading: boolean;
    error: string | null;
    items: HistoryRecord[];
  };
}

const initialState: HistoryState = {
  scope: 'mine',
  list: {
    loading: false,
    error: null,
    items: [],
  },
};

export const HistorySlice = createSlice({
  name: 'History',
  initialState,
  reducers: {
    setHistoryScope: (state, action: PayloadAction<HistoryScope>) => {
      state.scope = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchHistory_Service.pending, (state) => {
      state.list.loading = true;
      state.list.error = null;
    });
    builder.addCase(fetchHistory_Service.fulfilled, (state, action) => {
      state.list.loading = false;
      state.list.error = null;
      state.scope = action.payload.scope ?? state.scope;
      state.list.items = Array.isArray(action.payload?.data) ? action.payload.data : [];
    });
    builder.addCase(fetchHistory_Service.rejected, (state, action) => {
      state.list.loading = false;
      const payload = action.payload as { message?: string } | undefined;
      state.list.error =
        payload?.message || action.error.message || 'Could not load history';
    });
  },
});

export const { setHistoryScope } = HistorySlice.actions;

export default HistorySlice.reducer;
