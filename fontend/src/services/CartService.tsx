import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import {
  AddCartItemRequest,
  AddCartItemResponse,
  CartStatus,
  CreateCartSessionResponse,
  DeleteCartSessionResponse,
  GetCartItemsResponse,
  GetCartSessionsResponse,
  MutateCartSessionItemsResponse,
  RemoveAddedCartItemRequest,
  UpdateAddedCartItemRequest,
  UpdateCartSessionStatusResponse,
} from '../type/cart';
import { CheckoutCartResponse } from '../type/history';
import { getCartNumberForSession } from '../utils/cartSession';
import { RootState } from '../store/store';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const fetchPendingCartSessions_Service = createAsyncThunk(
  'cart/fetchPendingSessions',
  async () => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCartSessionsResponse>('/api/cart/sessions', {
        params: { status: 'pending' },
      });

      if (isHttpSuccess(response.status)) {
        console.log('Fetch pending cart sessions response:', response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load pending carts',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Fetch pending cart sessions error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const fetchAddedCartSessions_Service = createAsyncThunk(
  'cart/fetchAddedSessions',
  async () => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCartSessionsResponse>('/api/cart/sessions', {
        params: { status: 'added' },
      });

      if (isHttpSuccess(response.status)) {
        console.log('Fetch added cart sessions response:', response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load cart orders',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Fetch added cart sessions error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const fetchCartItems_Service = createAsyncThunk(
  'cart/fetchItems',
  async (params: { sessionId?: string; status?: CartStatus } = {}) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCartItemsResponse>('/api/cart', {
        params: {
          sessionId: params.sessionId,
          status: params.status,
        },
      });

      if (isHttpSuccess(response.status)) {
        console.log('Fetch cart items response:', response.data);
        return {
          ...response.data,
          sessionId: params.sessionId ?? null,
          status: params.status ?? null,
        };
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load cart items',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Fetch cart items error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const createCartSession_Service = createAsyncThunk(
  'cart/createSession',
  async (status: 'pending' | 'added' | 'proceed' = 'pending') => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<CreateCartSessionResponse>('/api/cart/sessions', {
        status,
      });

      if (isHttpSuccess(response.status)) {
        console.log('Create cart session response:', response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not create cart session',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Create cart session error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const addCartItem_Service = createAsyncThunk(
  'cart/addItem',
  async (payload: AddCartItemRequest) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<AddCartItemResponse>('/api/cart', {
        productId: payload.productId,
        quantity: payload.quantity,
        sessionId: payload.sessionId,
        status: payload.status ?? 'pending',
      });

      if (isHttpSuccess(response.status)) {
        console.log('Add cart item response:', response.data);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not add item to cart',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Add cart item error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const addProductToPendingCart_Service = createAsyncThunk(
  'cart/addProductToPendingCart',
  async (payload: { productId: string; quantity: number }, { dispatch, getState }) => {
    try {
      const state = getState() as RootState;
      let sessionId = state.CartReducer.activeSession.sessionId;
      let cartNumber = state.CartReducer.activeSession.cartNumber;

      if (!sessionId) {
        const session = await dispatch(createCartSession_Service('pending')).unwrap();
        sessionId = session.sessionId;
        cartNumber = session.cartNumber;
      }

      const item = await dispatch(
        addCartItem_Service({
          productId: payload.productId,
          quantity: payload.quantity,
          sessionId,
          status: 'pending',
        }),
      ).unwrap();

      await dispatch(fetchPendingCartSessions_Service());
      const pendingSessions = (getState() as RootState).CartReducer.pendingSessions.items;
      const resolvedCartNumber =
        getCartNumberForSession(pendingSessions, sessionId) ?? cartNumber ?? 1;

      return {
        sessionId,
        cartNumber: resolvedCartNumber,
        item: item.data,
      };
    } catch (error: any) {
      console.log('Add product to pending cart error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const revertAddedCartToPending_Service = createAsyncThunk(
  'cart/revertAddedToPending',
  async (sessionId: string, { dispatch }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.patch<UpdateCartSessionStatusResponse>(
        `/api/cart/sessions/${sessionId}/status`,
        { status: 'pending' },
      );

      if (isHttpSuccess(response.status)) {
        console.log('Revert added cart to pending response:', response.data);
        await Promise.all([
          dispatch(fetchAddedCartSessions_Service()),
          dispatch(fetchPendingCartSessions_Service()),
        ]);
        return { sessionId };
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not move cart back to pending',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Revert added cart to pending error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const deleteAddedCartSession_Service = createAsyncThunk(
  'cart/deleteAddedSession',
  async (sessionId: string, { dispatch }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<DeleteCartSessionResponse>(
        `/api/cart/sessions/${sessionId}`,
      );

      if (isHttpSuccess(response.status)) {
        console.log('Delete cart session response:', response.data);
        await Promise.all([
          dispatch(fetchPendingCartSessions_Service()),
          dispatch(fetchAddedCartSessions_Service()),
        ]);
        return { sessionId };
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not delete cart',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Delete added cart session error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const updateAddedCartItemQuantity_Service = createAsyncThunk(
  'cart/updateAddedItemQuantity',
  async (payload: UpdateAddedCartItemRequest, { dispatch }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.patch<MutateCartSessionItemsResponse>(
        `/api/cart/sessions/${payload.sessionId}/items`,
        {
          productId: payload.productId,
          quantity: payload.quantity,
        },
      );

      if (isHttpSuccess(response.status)) {
        console.log('Update added cart item response:', response.data);
        await Promise.all([
          dispatch(fetchAddedCartSessions_Service()),
          dispatch(
            fetchCartItems_Service({
              sessionId: payload.sessionId,
              status: 'added',
            }),
          ),
        ]);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not update cart item',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Update added cart item error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const removeAddedCartItem_Service = createAsyncThunk(
  'cart/removeAddedItem',
  async (payload: RemoveAddedCartItemRequest, { dispatch }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<MutateCartSessionItemsResponse>(
        `/api/cart/sessions/${payload.sessionId}/items/${payload.productId}`,
      );

      if (isHttpSuccess(response.status)) {
        console.log('Remove added cart item response:', response.data);
        await dispatch(fetchAddedCartSessions_Service());
        if (!response.data.cartDeleted) {
          await dispatch(
            fetchCartItems_Service({
              sessionId: payload.sessionId,
              status: 'added',
            }),
          );
        }
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not remove cart item',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Remove added cart item error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const checkoutCartSession_Service = createAsyncThunk(
  'cart/checkoutSession',
  async (sessionId: string, { dispatch, getState }) => {
    try {
      await ensureInternetConnection();

      const addedSessions = (getState() as RootState).CartReducer.addedSessions.items;
      const cartNumber = getCartNumberForSession(addedSessions, sessionId);

      const response = await apiClient.post<CheckoutCartResponse>('/api/history/checkout', {
        sessionId,
      });

      if (isHttpSuccess(response.status)) {
        console.log('Checkout cart session response:', response.data);
        await dispatch(fetchAddedCartSessions_Service());
        return {
          ...response.data,
          cartNumber,
        };
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not checkout cart',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Checkout cart session error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);

export const proceedCartSession_Service = createAsyncThunk(
  'cart/proceedSession',
  async (sessionId: string, { dispatch, getState }) => {
    try {
      await ensureInternetConnection();

      const pendingSessions = (getState() as RootState).CartReducer.pendingSessions.items;
      const cartNumber = getCartNumberForSession(pendingSessions, sessionId);

      const response = await apiClient.patch<UpdateCartSessionStatusResponse>(
        `/api/cart/sessions/${sessionId}/status`,
        { status: 'added' },
      );

      if (isHttpSuccess(response.status)) {
        console.log('Proceed cart session response:', response.data);
        await Promise.all([
          dispatch(fetchPendingCartSessions_Service()),
          dispatch(fetchAddedCartSessions_Service()),
        ]);
        return {
          ...response.data,
          cartNumber,
        };
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not proceed with cart',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log('Proceed cart session error:---', error);
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: 'Network Error',
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);
