import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  CreateShopUserRequest,
  CreateShopUserResponse,
  DeleteShopUserResponse,
  GetShopUsersResponse,
  UpdateShopUserRequest,
  UpdateShopUserResponse,
} from '../type/manageUser';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const fetchShopUsers_Service = createAsyncThunk(
  'manageUsers/fetchAll',
  async (_void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetShopUsersResponse>('/api/manage-users');

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load shop users',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('error in fetchShopUsers_Service', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const createShopUser_Service = createAsyncThunk(
  'manageUsers/create',
  async (payload: CreateShopUserRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<CreateShopUserResponse>(
        '/api/manage-users',
        payload,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not create user',
        code: response.data?.code,
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const updateShopUser_Service = createAsyncThunk(
  'manageUsers/update',
  async (payload: UpdateShopUserRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const { userId, password, ...fields } = payload;
      const body: Record<string, string> = { ...fields };
      if (password?.trim()) {
        body.password = password;
      }

      const response = await apiClient.put<UpdateShopUserResponse>(
        `/api/manage-users/${encodeURIComponent(userId)}`,
        body,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not update user',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const deleteShopUser_Service = createAsyncThunk(
  'manageUsers/delete',
  async (userId: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<DeleteShopUserResponse>(
        `/api/manage-users/${encodeURIComponent(userId)}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not delete user',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
