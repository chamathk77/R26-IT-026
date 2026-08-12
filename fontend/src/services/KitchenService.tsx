import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  GetKitchenTicketsResponse,
  KitchenTicketStatus,
  UpdateKitchenTicketStatusResponse,
} from '../type/kitchen';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const fetchKitchenTickets_Service = createAsyncThunk(
  'kitchen/fetchTickets',
  async (params: { status?: string; limit?: number } = {}, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetKitchenTicketsResponse>('/api/kitchen/tickets', {
        params: {
          ...(params.status ? { status: params.status } : undefined),
          ...(params.limit ? { limit: params.limit } : undefined),
        },
      });

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      return rejectWithValue({
        error: 'Error',
        message: 'Could not load kitchen tickets',
        status: response.status,
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const fetchServedKitchenTickets_Service = createAsyncThunk(
  'kitchen/fetchServedTickets',
  async (params: { limit?: number } = {}, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetKitchenTicketsResponse>('/api/kitchen/tickets', {
        params: {
          status: 'served',
          limit: params.limit ?? 30,
        },
      });

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      return rejectWithValue({
        error: 'Error',
        message: 'Could not load served kitchen tickets',
        status: response.status,
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const updateKitchenTicketStatus_Service = createAsyncThunk(
  'kitchen/updateTicketStatus',
  async (
    payload: { ticketId: string; status: KitchenTicketStatus },
    { rejectWithValue },
  ) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.patch<UpdateKitchenTicketStatusResponse>(
        `/api/kitchen/tickets/${payload.ticketId}/status`,
        { status: payload.status },
      );

      if (isHttpSuccess(response.status) && response.data?.success && response.data.data) {
        return response.data.data;
      }

      return rejectWithValue({
        error: 'Error',
        message: 'Could not update kitchen ticket',
        status: response.status,
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
