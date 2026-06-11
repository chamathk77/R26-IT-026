import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
import {
  CreateProductRequest,
  CreateProductResponse,
  DeleteProductResponse,
  GetProductsResponse,
  UpdateProductPayload,
  UpdateProductResponse,
} from '../type/product';

type ProductBodyFields = Omit<UpdateProductPayload, 'id'>;

function hasNumericValue(value: number | null | undefined): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

function appendOptionalField(
  formData: FormData,
  key: string,
  value: string | number | boolean | null | undefined,
) {
  if (value === undefined || value === null || value === '') return;
  formData.append(key, String(value));
}

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function isLocalImageUri(uri: string): boolean {
  return /^(file|content|ph|assets-library):\/\//i.test(uri);
}

function appendImageToFormData(formData: FormData, imageUri: string) {
  const fileName = imageUri.split('/').pop() ?? `product-${Date.now()}.jpg`;
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

function buildProductFormData(
  payload: ProductBodyFields,
  options?: { includeImage?: boolean },
): FormData {
  const formData = new FormData();

  if (payload.productName != null) {
    formData.append('productName', payload.productName.trim());
  }
  appendOptionalField(formData, 'categoryId', payload.categoryId);
  appendOptionalField(formData, 'categoryName', payload.categoryName);
  appendOptionalField(formData, 'type', payload.type);
  if (hasNumericValue(payload.amount)) {
    formData.append('amount', String(payload.amount));
  }
  if (payload.cost === null) {
    formData.append('cost', '');
  } else if (hasNumericValue(payload.cost)) {
    formData.append('cost', String(payload.cost));
  }
  if (payload.isInventoryAvailable != null) {
    formData.append('isInventoryAvailable', String(payload.isInventoryAvailable));
  }
  if (payload.barcode !== undefined) {
    formData.append('barcode', payload.barcode == null ? '' : String(payload.barcode));
  }
  if (hasNumericValue(payload.qty)) {
    formData.append('qty', String(payload.qty));
  }

  if (options?.includeImage && payload.imageUri && isLocalImageUri(payload.imageUri)) {
    appendImageToFormData(formData, payload.imageUri);
  }

  return formData;
}

function buildProductJsonBody(payload: ProductBodyFields) {
  const body: Record<string, unknown> = {};

  if (payload.productName != null) body.productName = payload.productName.trim();
  if (payload.categoryId) body.categoryId = payload.categoryId;
  if (payload.categoryName) body.categoryName = payload.categoryName;
  if (payload.type) body.type = payload.type;
  if (hasNumericValue(payload.amount)) body.amount = payload.amount;
  if (payload.cost === null) body.cost = null;
  else if (hasNumericValue(payload.cost)) body.cost = payload.cost;
  if (payload.isInventoryAvailable != null) {
    body.isInventoryAvailable = payload.isInventoryAvailable;
  }
  if (payload.barcode !== undefined) body.barcode = payload.barcode;
  if (hasNumericValue(payload.qty)) body.qty = payload.qty;

  return body;
}

export const createProduct_Service = createAsyncThunk(
  'product/create',
  async (payload: CreateProductRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const hasImage = Boolean(payload.imageUri && isLocalImageUri(payload.imageUri));
      const response = await apiClient.post<CreateProductResponse>(
        '/api/products',
        hasImage
          ? buildProductFormData(payload, { includeImage: true })
          : buildProductJsonBody(payload),
        hasImage ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not create product',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      console.log('Create product error:---', error);
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const fetchProducts_Service = createAsyncThunk(
  'product/fetchAll',
  async (_void, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetProductsResponse>('/api/products');

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load products',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      console.log('Fetch products error:---', error);
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const deleteProduct_Service = createAsyncThunk(
  'product/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<DeleteProductResponse>(`/api/products/${id}`);

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data.data?.id ?? id;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not delete product',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      console.log('Delete product error:---', error);
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);

export const updateProduct_Service = createAsyncThunk(
  'product/update',
  async (payload: UpdateProductPayload, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const { id, imageUri, ...fields } = payload;
      const hasNewImage = Boolean(imageUri && isLocalImageUri(imageUri));
      const bodyPayload: ProductBodyFields = {
        ...fields,
        imageUri: hasNewImage ? imageUri : null,
      };

      const response = await apiClient.post<UpdateProductResponse>(
        `/api/products/${encodeURIComponent(id)}/update`,
        hasNewImage
          ? buildProductFormData(bodyPayload, { includeImage: true })
          : buildProductJsonBody(bodyPayload),
        hasNewImage ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not update product',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      console.log('Update product error:---', error);
      return rejectWithValue(toApiErrorResponse(error));
    }
  },
);
