import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  BulkCreateTablesRequest,
  BulkCreateTablesResponse,
  BulkDeleteTablesRequest,
  BulkDeleteTablesResponse,
  CreateTableRequest,
  CreateTableResponse,
  DeleteTableResponse,
  GetTablesResponse,
  UpdateTablePayload,
  UpdateTableResponse,
} from '../type/table';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const fetchTables_Service = createAsyncThunk(
  'table/fetchAll',
  async (params: { includeInactive?: boolean } | void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetTablesResponse>('/api/tables', {
        params: params?.includeInactive ? { includeInactive: 'true' } : undefined,
      });

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load tables',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const createTable_Service = createAsyncThunk(
  'table/create',
  async (payload: CreateTableRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<CreateTableResponse>('/api/tables', {
        tableNumber: payload.tableNumber.trim(),
        tableName: payload.tableName?.trim() || '',
        capacity: payload.capacity ?? null,
        zone: payload.zone?.trim() || '',
        sortOrder: payload.sortOrder,
      });

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not create table',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const bulkCreateTables_Service = createAsyncThunk(
  'table/bulkCreate',
  async (payload: BulkCreateTablesRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<BulkCreateTablesResponse>('/api/tables/bulk', {
        count: payload.count,
        startNumber: payload.startNumber,
        prefix: payload.prefix?.trim() || undefined,
        zone: payload.zone?.trim() || undefined,
        defaultCapacity: payload.defaultCapacity ?? null,
      });

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not create tables',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const updateTable_Service = createAsyncThunk(
  'table/update',
  async (payload: UpdateTablePayload, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const body: Record<string, unknown> = {};
      if (payload.tableNumber !== undefined) body.tableNumber = payload.tableNumber.trim();
      if (payload.tableName !== undefined) body.tableName = payload.tableName.trim();
      if (payload.capacity !== undefined) body.capacity = payload.capacity;
      if (payload.zone !== undefined) body.zone = payload.zone.trim();
      if (payload.sortOrder !== undefined) body.sortOrder = payload.sortOrder;
      if (payload.isActive !== undefined) body.isActive = payload.isActive;

      const response = await apiClient.post<UpdateTableResponse>(
        `/api/tables/${encodeURIComponent(payload.id)}/update`,
        body,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not update table',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const deleteTable_Service = createAsyncThunk(
  'table/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<DeleteTableResponse>(
        `/api/tables/${encodeURIComponent(id)}/delete`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not delete table',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const bulkDeleteTables_Service = createAsyncThunk(
  'table/bulkDelete',
  async (payload: BulkDeleteTablesRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<BulkDeleteTablesResponse>('/api/tables/bulk-delete', {
        ids: payload.ids,
      });

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not delete tables',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
