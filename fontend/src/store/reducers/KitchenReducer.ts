import { createSlice } from '@reduxjs/toolkit';
import { clearLoginSession } from './AuthReducer';
import {
  fetchKitchenTickets_Service,
  fetchServedKitchenTickets_Service,
  updateKitchenTicketStatus_Service,
} from '../../services/KitchenService';
import { KitchenTicket } from '../../type/kitchen';
import { ApiErrorResponse } from '../../type/common';

interface KitchenState {
  tickets: {
    loading: boolean;
    error: string | null;
    items: KitchenTicket[];
    shopId: string | null;
    branchId: string | null;
  };
  servedTickets: {
    loading: boolean;
    error: string | null;
    items: KitchenTicket[];
  };
  updateStatus: {
    loadingTicketId: string | null;
    error: string | null;
  };
}

const initialState: KitchenState = {
  tickets: {
    loading: false,
    error: null,
    items: [],
    shopId: null,
    branchId: null,
  },
  servedTickets: {
    loading: false,
    error: null,
    items: [],
  },
  updateStatus: {
    loadingTicketId: null,
    error: null,
  },
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as ApiErrorResponse).message ?? fallback);
  }
  return fallback;
}

const KitchenReducer = createSlice({
  name: 'KitchenReducer',
  initialState,
  reducers: {
    clearKitchenTickets: (state) => {
      state.tickets = initialState.tickets;
      state.servedTickets = initialState.servedTickets;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(clearLoginSession, () => initialState);

    builder.addCase(fetchKitchenTickets_Service.pending, (state) => {
      state.tickets.loading = true;
      state.tickets.error = null;
    });
    builder.addCase(fetchKitchenTickets_Service.fulfilled, (state, action) => {
      state.tickets.loading = false;
      state.tickets.error = null;
      state.tickets.items = Array.isArray(action.payload.data) ? action.payload.data : [];
      state.tickets.shopId = action.payload.shopId ?? null;
      state.tickets.branchId = action.payload.branchId ?? null;
    });
    builder.addCase(fetchKitchenTickets_Service.rejected, (state, action) => {
      state.tickets.loading = false;
      state.tickets.error = getErrorMessage(action.payload, 'Could not load kitchen tickets');
    });

    builder.addCase(fetchServedKitchenTickets_Service.pending, (state) => {
      state.servedTickets.loading = true;
      state.servedTickets.error = null;
    });
    builder.addCase(fetchServedKitchenTickets_Service.fulfilled, (state, action) => {
      state.servedTickets.loading = false;
      state.servedTickets.error = null;
      state.servedTickets.items = Array.isArray(action.payload.data) ? action.payload.data : [];
    });
    builder.addCase(fetchServedKitchenTickets_Service.rejected, (state, action) => {
      state.servedTickets.loading = false;
      state.servedTickets.error = getErrorMessage(action.payload, 'Could not load served tickets');
    });

    builder.addCase(updateKitchenTicketStatus_Service.pending, (state, action) => {
      state.updateStatus.loadingTicketId = action.meta.arg.ticketId;
      state.updateStatus.error = null;
    });
    builder.addCase(updateKitchenTicketStatus_Service.fulfilled, (state, action) => {
      state.updateStatus.loadingTicketId = null;
      state.updateStatus.error = null;
      const index = state.tickets.items.findIndex((ticket) => ticket._id === action.payload._id);
      if (index >= 0) {
        if (action.payload.status === 'served' || action.payload.status === 'cancelled') {
          state.tickets.items.splice(index, 1);
        } else {
          state.tickets.items[index] = action.payload;
        }
      }

      if (action.payload.status === 'served') {
        const servedIndex = state.servedTickets.items.findIndex(
          (ticket) => ticket._id === action.payload._id,
        );
        if (servedIndex >= 0) {
          state.servedTickets.items[servedIndex] = action.payload;
        } else {
          state.servedTickets.items.unshift(action.payload);
          if (state.servedTickets.items.length > 30) {
            state.servedTickets.items.length = 30;
          }
        }
      }
    });
    builder.addCase(updateKitchenTicketStatus_Service.rejected, (state, action) => {
      state.updateStatus.loadingTicketId = null;
      state.updateStatus.error = getErrorMessage(action.payload, 'Could not update kitchen ticket');
    });
  },
});

export const { clearKitchenTickets } = KitchenReducer.actions;
export default KitchenReducer.reducer;
