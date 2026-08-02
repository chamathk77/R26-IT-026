import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  CreateSalePersonRequest,
  CreateSalePersonResponse,
  DeleteSalePersonResponse,
  GetSalePersonByIdResponse,
  GetSalePersonsResponse,
  GetSalePersonsForLoggedUserBranchResponse,
  UpdateSalePersonPayload,
  UpdateSalePersonResponse,
} from '../type/salePerson';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function isLocalImageUri(uri: string): boolean {
  return /^(file|content|ph|assets-library):\/\//i.test(uri);
}

function appendImageToFormData(formData: FormData, imageUri: string) {
  const fileName = imageUri.split('/').pop() ?? `sale-person-${Date.now()}.jpg`;
  const extension = fileName.split('.').pop()?.toLowerCase();
  const mimeType =
    extension === 'png'
      ? 'image/png'
      : extension === 'gif'
        ? 'image/gif'
        : extension === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

  formData.append('image', {
    uri: imageUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
}

function appendAllowedBranchIds(
  target: FormData | Record<string, string | string[]>,
  allowedBranchIds?: string[],
) {
  if (!Array.isArray(allowedBranchIds)) return;

  const normalized = [
    ...new Set(allowedBranchIds.map((id) => String(id).trim().toUpperCase()).filter(Boolean)),
  ];

  if (target instanceof FormData) {
    target.append('allowedBranchIds', normalized.join(','));
    return;
  }

  target.allowedBranchIds = normalized;
}

function buildSalePersonFormData(
  fields: {
    salePersonId?: string;
    firstName?: string;
    lastName?: string;
    position?: string;
    allowedBranchIds?: string[];
    imageUri?: string | null;
  },
  options?: { includeImage?: boolean },
): FormData {
  const formData = new FormData();

  if (fields.salePersonId != null) {
    formData.append('salePersonId', fields.salePersonId.trim().toUpperCase());
  }
  if (fields.firstName != null) {
    formData.append('firstName', fields.firstName.trim());
  }
  if (fields.lastName != null) {
    formData.append('lastName', fields.lastName.trim());
  }
  if (fields.position != null) {
    formData.append('position', fields.position.trim());
  }
  appendAllowedBranchIds(formData, fields.allowedBranchIds);

  if (options?.includeImage && fields.imageUri && isLocalImageUri(fields.imageUri)) {
    appendImageToFormData(formData, fields.imageUri);
  }

  return formData;
}

function buildSalePersonJsonBody(fields: {
  salePersonId?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  allowedBranchIds?: string[];
}) {
  const body: Record<string, string | string[]> = {};

  if (fields.salePersonId != null) {
    body.salePersonId = fields.salePersonId.trim().toUpperCase();
  }
  if (fields.firstName != null) {
    body.firstName = fields.firstName.trim();
  }
  if (fields.lastName != null) {
    body.lastName = fields.lastName.trim();
  }
  if (fields.position != null) {
    body.position = fields.position.trim();
  }
  appendAllowedBranchIds(body, fields.allowedBranchIds);

  return body;
}

export const fetchSalePersons_Service = createAsyncThunk(
  'salePerson/fetchAll',
  async (_void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetSalePersonsResponse>('/api/sale-persons');

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load sales persons',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('error in fetchSalePersons_Service', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const fetchSalePersonsForLoggedUserBranch_Service = createAsyncThunk(
  'salePerson/fetchForLoggedUserBranch',
  async (_void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetSalePersonsForLoggedUserBranchResponse>(
        '/api/sale-persons/logged-user/branch',
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: response.data?.message || 'Could not load sales persons for this branch',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const fetchSalePersonById_Service = createAsyncThunk(
  'salePerson/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetSalePersonByIdResponse>(
        `/api/sale-persons/${encodeURIComponent(id)}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load sales person',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const createSalePerson_Service = createAsyncThunk(
  'salePerson/create',
  async (payload: CreateSalePersonRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const hasImage = Boolean(payload.imageUri && isLocalImageUri(payload.imageUri));
      const response = await apiClient.post<CreateSalePersonResponse>(
        '/api/sale-persons',
        hasImage
          ? buildSalePersonFormData(payload, { includeImage: true })
          : buildSalePersonJsonBody(payload),
        hasImage ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not create sales person',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const updateSalePerson_Service = createAsyncThunk(
  'salePerson/update',
  async (payload: UpdateSalePersonPayload, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const { id, imageUri, ...fields } = payload;
      const hasImage = Boolean(imageUri && isLocalImageUri(imageUri));
      const response = await apiClient.post<UpdateSalePersonResponse>(
        `/api/sale-persons/${encodeURIComponent(id)}/update`,
        hasImage
          ? buildSalePersonFormData({ ...fields, imageUri }, { includeImage: true })
          : buildSalePersonJsonBody(fields),
        hasImage ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not update sales person',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const deleteSalePerson_Service = createAsyncThunk(
  'salePerson/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<DeleteSalePersonResponse>(
        `/api/sale-persons/${encodeURIComponent(id)}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not delete sales person',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
