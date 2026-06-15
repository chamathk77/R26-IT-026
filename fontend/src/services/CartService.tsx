import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { ApiErrorResponse } from '../type/common';
import { toApiErrorResponse } from '../utils/apiErrorAlert';
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
import { CheckoutCartRequest, CheckoutCartResponse } from '../type/history';
import { getCartNumberForSession } from '../utils/cartSession';
import { RootState } from '../store/store';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const fetchPendingCartSessions_Service = createAsyncThunk(
  'cart/fetchPendingSessions',
  async (_, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCartSessionsResponse>('/api/cart/sessions', {
        params: { status: 'pending' },
      });

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load pending carts',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('Fetch pending cart sessions error:', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const fetchAddedCartSessions_Service = createAsyncThunk(
  'cart/fetchAddedSessions',
  async (_, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCartSessionsResponse>('/api/cart/sessions', {
        params: { status: 'added' },
      });

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not load cart orders',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('Fetch added cart sessions error:', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const fetchCartItems_Service = createAsyncThunk(
  'cart/fetchItems',
  async (params: { sessionId?: string; status?: CartStatus } = {}, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.get<GetCartItemsResponse>('/api/cart', {
        params: {
          sessionId: params.sessionId,
          status: params.status,
        },
      });

      if (isHttpSuccess(response.status) && response.data?.success) {
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('Fetch cart items error:', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const createCartSession_Service = createAsyncThunk(
  'cart/createSession',
  async (_, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<CreateCartSessionResponse>('/api/cart/sessions', {});

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not create cart',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('Create cart session error:', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const createNewPendingCart_Service = createAsyncThunk(
  'cart/createNewPending',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const session = await dispatch(createCartSession_Service()).unwrap();
      await dispatch(fetchPendingCartSessions_Service());
      return session;
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('Create new pending cart error:', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const addCartItem_Service = createAsyncThunk(
  'cart/addItem',
  async (payload: AddCartItemRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<AddCartItemResponse>('/api/cart', {
        productId: payload.productId,
        quantity: payload.quantity,
        sessionId: payload.sessionId,
      });

      if (isHttpSuccess(response.status) && response.data?.success) {
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not add item to cart',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('Add cart item error:', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const addProductToPendingCart_Service = createAsyncThunk(
  'cart/addProductToPendingCart',
  async (
    payload: { productId: string; quantity: number; forceNewCart?: boolean },
    { dispatch, getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as RootState;
      let sessionId = payload.forceNewCart ? null : state.CartReducer.activeSession.sessionId;
      let cartNumber = payload.forceNewCart ? null : state.CartReducer.activeSession.cartNumber;

      if (!sessionId) {
        const session = await dispatch(createCartSession_Service()).unwrap();
        sessionId = session.sessionId;
        cartNumber = session.cartNumber;
      }

      const item = await dispatch(
        addCartItem_Service({
          productId: payload.productId,
          quantity: payload.quantity,
          sessionId,
        }),
      ).unwrap();

      await Promise.all([
        dispatch(fetchPendingCartSessions_Service()),
        dispatch(
          fetchCartItems_Service({
            sessionId,
            status: 'pending',
          }),
        ),
      ]);

      const pendingSessions = (getState() as RootState).CartReducer.pendingSessions.items;
      const resolvedCartNumber =
        item.cartNumber ??
        getCartNumberForSession(pendingSessions, sessionId) ??
        cartNumber ??
        1;

      return {
        sessionId,
        cartNumber: resolvedCartNumber,
        item: item.data,
      };
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      console.log('Add product to pending cart error:', apiError);
      return rejectWithValue(apiError);
    }
  },
);

export const updatePendingCartItemQuantity_Service = createAsyncThunk(
  'cart/updatePendingItemQuantity',
  async (payload: UpdateAddedCartItemRequest, { dispatch, rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.patch<MutateCartSessionItemsResponse>(
        `/api/cart/sessions/${payload.sessionId}/items`,
        {
          productId: payload.productId,
          quantity: payload.quantity,
        },
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        await Promise.all([
          dispatch(fetchPendingCartSessions_Service()),
          dispatch(
            fetchCartItems_Service({
              sessionId: payload.sessionId,
              status: 'pending',
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      return rejectWithValue(apiError);
    }
  },
);

export const removePendingCartItem_Service = createAsyncThunk(
  'cart/removePendingItem',
  async (payload: RemoveAddedCartItemRequest, { dispatch, rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<MutateCartSessionItemsResponse>(
        `/api/cart/sessions/${payload.sessionId}/items/${payload.productId}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
        await Promise.all([
          dispatch(fetchPendingCartSessions_Service()),
          dispatch(
            fetchCartItems_Service({
              sessionId: payload.sessionId,
              status: 'pending',
            }),
          ),
        ]);
        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: 'Error',
        message: 'Could not remove cart item',
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      return rejectWithValue(apiError);
    }
  },
);

export const revertAddedCartToPending_Service = createAsyncThunk(
  'cart/revertAddedToPending',
  async (sessionId: string, { dispatch, rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.patch<UpdateCartSessionStatusResponse>(
        `/api/cart/sessions/${sessionId}/status`,
        { status: 'pending' },
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      return rejectWithValue(apiError);
    }
  },
);

export const deleteAddedCartSession_Service = createAsyncThunk(
  'cart/deleteAddedSession',
  async (sessionId: string, { dispatch, rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<DeleteCartSessionResponse>(
        `/api/cart/sessions/${sessionId}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      return rejectWithValue(apiError);
    }
  },
);

export const updateAddedCartItemQuantity_Service = createAsyncThunk(
  'cart/updateAddedItemQuantity',
  async (payload: UpdateAddedCartItemRequest, { dispatch, rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.patch<MutateCartSessionItemsResponse>(
        `/api/cart/sessions/${payload.sessionId}/items`,
        {
          productId: payload.productId,
          quantity: payload.quantity,
        },
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      return rejectWithValue(apiError);
    }
  },
);

export const removeAddedCartItem_Service = createAsyncThunk(
  'cart/removeAddedItem',
  async (payload: RemoveAddedCartItemRequest, { dispatch, rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.delete<MutateCartSessionItemsResponse>(
        `/api/cart/sessions/${payload.sessionId}/items/${payload.productId}`,
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      return rejectWithValue(apiError);
    }
  },
);

export const checkoutCartSession_Service = createAsyncThunk(
  'cart/checkoutSession',
  async (payload: CheckoutCartRequest, { dispatch, getState, rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const addedSessions = (getState() as RootState).CartReducer.addedSessions.items;
      const cartNumber = getCartNumberForSession(addedSessions, payload.sessionId);

      const response = await apiClient.post<CheckoutCartResponse>('/api/history/checkout', payload);

      if (isHttpSuccess(response.status) && response.data?.success) {
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      return rejectWithValue(apiError);
    }
  },
);

export const proceedCartSession_Service = createAsyncThunk(
  'cart/proceedSession',
  async (sessionId: string, { dispatch, getState, rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const pendingSessions = (getState() as RootState).CartReducer.pendingSessions.items;
      const cartNumber = getCartNumberForSession(pendingSessions, sessionId);

      const response = await apiClient.patch<UpdateCartSessionStatusResponse>(
        `/api/cart/sessions/${sessionId}/status`,
        { status: 'added' },
      );

      if (isHttpSuccess(response.status) && response.data?.success) {
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
      return rejectWithValue(apiError);
    } catch (error: unknown) {
      const apiError = toApiErrorResponse(error);
      return rejectWithValue(apiError);
    }
  },
);
