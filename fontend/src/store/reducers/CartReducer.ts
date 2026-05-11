import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  addCartItem_Service,
  addProductToPendingCart_Service,
  checkoutCartSession_Service,
  deleteAddedCartSession_Service,
  fetchAddedCartSessions_Service,
  fetchCartItems_Service,
  fetchPendingCartSessions_Service,
  proceedCartSession_Service,
  removeAddedCartItem_Service,
  revertAddedCartToPending_Service,
  updateAddedCartItemQuantity_Service,
} from '../../services/CartService';
import { CartOrder, CartSessionSummary } from '../../type/cart';
import { buildCartOrderFromLines } from '../../utils/cartOrder';

interface ActiveSessionState {
  sessionId: string | null;
  cartNumber: number | null;
}

interface CartState {
  activeSession: ActiveSessionState;
  pendingSessions: {
    loading: boolean;
    error: string | null;
    items: CartSessionSummary[];
  };
  addedSessions: {
    loading: boolean;
    error: string | null;
    items: CartSessionSummary[];
  };
  sessionItems: {
    loading: boolean;
    error: string | null;
    sessionId: string | null;
    order: CartOrder | null;
  };
  cartTab: {
    loading: boolean;
    error: string | null;
    sessionId: string | null;
    cartNumber: number | null;
    order: CartOrder | null;
  };
  addToCart: {
    loading: boolean;
    error: string | null;
    lastSessionId: string | null;
    lastCartNumber: number | null;
  };
  proceed: {
    loading: boolean;
    error: string | null;
  };
  checkout: {
    loading: boolean;
    error: string | null;
  };
  manageAdded: {
    loadingSessionId: string | null;
    error: string | null;
  };
  editCart: {
    loadingProductId: string | null;
    error: string | null;
  };
}

const initialState: CartState = {
  activeSession: {
    sessionId: null,
    cartNumber: null,
  },
  pendingSessions: {
    loading: false,
    error: null,
    items: [],
  },
  addedSessions: {
    loading: false,
    error: null,
    items: [],
  },
  sessionItems: {
    loading: false,
    error: null,
    sessionId: null,
    order: null,
  },
  cartTab: {
    loading: false,
    error: null,
    sessionId: null,
    cartNumber: null,
    order: null,
  },
  addToCart: {
    loading: false,
    error: null,
    lastSessionId: null,
    lastCartNumber: null,
  },
  proceed: {
    loading: false,
    error: null,
  },
  checkout: {
    loading: false,
    error: null,
  },
  manageAdded: {
    loadingSessionId: null,
    error: null,
  },
  editCart: {
    loadingProductId: null,
    error: null,
  },
};

export const CartSlice = createSlice({
  name: 'Cart',
  initialState,
  reducers: {
    resetAddToCart: (state) => {
      state.addToCart = initialState.addToCart;
    },
    setActiveSession: (state, action: PayloadAction<ActiveSessionState>) => {
      state.activeSession = action.payload;
    },
    clearActiveSession: (state) => {
      state.activeSession = initialState.activeSession;
    },
    clearSessionItems: (state) => {
      state.sessionItems = initialState.sessionItems;
    },
    setCartTabSelection: (
      state,
      action: PayloadAction<{ sessionId: string; cartNumber: number | null }>,
    ) => {
      state.cartTab.sessionId = action.payload.sessionId;
      state.cartTab.cartNumber = action.payload.cartNumber;
      state.cartTab.error = null;
    },
    clearCartTabSelection: (state) => {
      state.cartTab = initialState.cartTab;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchPendingCartSessions_Service.pending, (state) => {
      state.pendingSessions.loading = true;
      state.pendingSessions.error = null;
    });
    builder.addCase(fetchPendingCartSessions_Service.fulfilled, (state, action) => {
      state.pendingSessions.loading = false;
      state.pendingSessions.error = null;
      state.pendingSessions.items = Array.isArray(action.payload?.data) ? action.payload.data : [];

      if (state.activeSession.sessionId) {
        const stillPending = state.pendingSessions.items.some(
          (session) => session.sessionId === state.activeSession.sessionId,
        );
        if (!stillPending) {
          state.activeSession = initialState.activeSession;
        }
      }
    });
    builder.addCase(fetchPendingCartSessions_Service.rejected, (state, action) => {
      state.pendingSessions.loading = false;
      const payload = action.payload as { message?: string } | undefined;
      state.pendingSessions.error =
        payload?.message || action.error.message || 'Could not load pending carts';
    });

    builder.addCase(fetchAddedCartSessions_Service.pending, (state) => {
      state.addedSessions.loading = true;
      state.addedSessions.error = null;
    });
    builder.addCase(fetchAddedCartSessions_Service.fulfilled, (state, action) => {
      state.addedSessions.loading = false;
      state.addedSessions.error = null;
      state.addedSessions.items = Array.isArray(action.payload?.data) ? action.payload.data : [];
    });
    builder.addCase(fetchAddedCartSessions_Service.rejected, (state, action) => {
      state.addedSessions.loading = false;
      const payload = action.payload as { message?: string } | undefined;
      state.addedSessions.error =
        payload?.message || action.error.message || 'Could not load cart orders';
    });

    builder.addCase(fetchCartItems_Service.pending, (state, action) => {
      if (action.meta.arg.status === 'added') {
        state.cartTab.loading = true;
        state.cartTab.error = null;
        return;
      }
      state.sessionItems.loading = true;
      state.sessionItems.error = null;
    });
    builder.addCase(fetchCartItems_Service.fulfilled, (state, action) => {
      const lines = Array.isArray(action.payload?.data) ? action.payload.data : [];
      const sessionId = action.payload.sessionId ?? lines[0]?.sessionId ?? null;
      const order =
        sessionId !== null
          ? buildCartOrderFromLines(sessionId, lines, {
              status: action.meta.arg.status ?? lines[0]?.status,
            })
          : null;

      if (action.meta.arg.status === 'added') {
        state.cartTab.loading = false;
        state.cartTab.error = null;
        state.cartTab.sessionId = sessionId;
        state.cartTab.order = order;
        return;
      }

      state.sessionItems.loading = false;
      state.sessionItems.error = null;
      state.sessionItems.sessionId = sessionId;
      state.sessionItems.order = order;
    });
    builder.addCase(fetchCartItems_Service.rejected, (state, action) => {
      const payload = action.payload as { message?: string } | undefined;
      const message = payload?.message || action.error.message || 'Could not load cart items';
      if (action.meta.arg.status === 'added') {
        state.cartTab.loading = false;
        state.cartTab.error = message;
        return;
      }
      state.sessionItems.loading = false;
      state.sessionItems.error = message;
    });

    builder.addCase(addProductToPendingCart_Service.pending, (state) => {
      state.addToCart.loading = true;
      state.addToCart.error = null;
    });
    builder.addCase(addProductToPendingCart_Service.fulfilled, (state, action) => {
      state.addToCart.loading = false;
      state.addToCart.error = null;
      state.addToCart.lastSessionId = action.payload.sessionId;
      state.addToCart.lastCartNumber = action.payload.cartNumber;
      state.activeSession = {
        sessionId: action.payload.sessionId,
        cartNumber: action.payload.cartNumber,
      };
    });
    builder.addCase(addProductToPendingCart_Service.rejected, (state, action) => {
      state.addToCart.loading = false;
      const payload = action.payload as { message?: string } | undefined;
      state.addToCart.error =
        payload?.message || action.error.message || 'Could not add item to cart';
    });

    builder.addCase(addCartItem_Service.pending, (state) => {
      state.addToCart.loading = true;
      state.addToCart.error = null;
    });
    builder.addCase(addCartItem_Service.fulfilled, (state) => {
      state.addToCart.loading = false;
      state.addToCart.error = null;
    });
    builder.addCase(addCartItem_Service.rejected, (state, action) => {
      state.addToCart.loading = false;
      const payload = action.payload as { message?: string } | undefined;
      state.addToCart.error =
        payload?.message || action.error.message || 'Could not add item to cart';
    });

    builder.addCase(proceedCartSession_Service.pending, (state) => {
      state.proceed.loading = true;
      state.proceed.error = null;
    });
    builder.addCase(proceedCartSession_Service.fulfilled, (state, action) => {
      state.proceed.loading = false;
      state.proceed.error = null;
      state.cartTab.sessionId = action.payload.sessionId;
      state.cartTab.cartNumber = action.payload.cartNumber ?? null;
      state.cartTab.order = buildCartOrderFromLines(
        action.payload.sessionId,
        Array.isArray(action.payload?.data) ? action.payload.data : [],
        { status: action.payload.status },
      );
      if (state.activeSession.sessionId === action.payload.sessionId) {
        state.activeSession = initialState.activeSession;
      }
    });
    builder.addCase(proceedCartSession_Service.rejected, (state, action) => {
      state.proceed.loading = false;
      const payload = action.payload as { message?: string } | undefined;
      state.proceed.error =
        payload?.message || action.error.message || 'Could not proceed with cart';
    });

    builder.addCase(checkoutCartSession_Service.pending, (state) => {
      state.checkout.loading = true;
      state.checkout.error = null;
    });
    builder.addCase(checkoutCartSession_Service.fulfilled, (state, action) => {
      state.checkout.loading = false;
      state.checkout.error = null;
      if (state.cartTab.sessionId === action.payload.sessionId) {
        state.cartTab = initialState.cartTab;
      }
    });
    builder.addCase(checkoutCartSession_Service.rejected, (state, action) => {
      state.checkout.loading = false;
      const payload = action.payload as { message?: string } | undefined;
      state.checkout.error =
        payload?.message || action.error.message || 'Could not checkout cart';
    });

    builder.addCase(revertAddedCartToPending_Service.pending, (state, action) => {
      state.manageAdded.loadingSessionId = action.meta.arg;
      state.manageAdded.error = null;
    });
    builder.addCase(revertAddedCartToPending_Service.fulfilled, (state, action) => {
      state.manageAdded.loadingSessionId = null;
      state.manageAdded.error = null;
      if (state.cartTab.sessionId === action.payload.sessionId) {
        state.cartTab = initialState.cartTab;
      }
    });
    builder.addCase(revertAddedCartToPending_Service.rejected, (state, action) => {
      state.manageAdded.loadingSessionId = null;
      const payload = action.payload as { message?: string } | undefined;
      state.manageAdded.error =
        payload?.message || action.error.message || 'Could not move cart back to pending';
    });

    builder.addCase(deleteAddedCartSession_Service.pending, (state, action) => {
      state.manageAdded.loadingSessionId = action.meta.arg;
      state.manageAdded.error = null;
    });
    builder.addCase(deleteAddedCartSession_Service.fulfilled, (state, action) => {
      state.manageAdded.loadingSessionId = null;
      state.manageAdded.error = null;
      if (state.cartTab.sessionId === action.payload.sessionId) {
        state.cartTab = initialState.cartTab;
      }
      if (state.activeSession.sessionId === action.payload.sessionId) {
        state.activeSession = initialState.activeSession;
      }
      if (state.sessionItems.sessionId === action.payload.sessionId) {
        state.sessionItems = initialState.sessionItems;
      }
    });
    builder.addCase(deleteAddedCartSession_Service.rejected, (state, action) => {
      state.manageAdded.loadingSessionId = null;
      const payload = action.payload as { message?: string } | undefined;
      state.manageAdded.error =
        payload?.message || action.error.message || 'Could not delete cart';
    });

    builder.addCase(updateAddedCartItemQuantity_Service.pending, (state, action) => {
      state.editCart.loadingProductId = action.meta.arg.productId;
      state.editCart.error = null;
    });
    builder.addCase(updateAddedCartItemQuantity_Service.fulfilled, (state) => {
      state.editCart.loadingProductId = null;
      state.editCart.error = null;
    });
    builder.addCase(updateAddedCartItemQuantity_Service.rejected, (state, action) => {
      state.editCart.loadingProductId = null;
      const payload = action.payload as { message?: string } | undefined;
      state.editCart.error =
        payload?.message || action.error.message || 'Could not update cart item';
    });

    builder.addCase(removeAddedCartItem_Service.pending, (state, action) => {
      state.editCart.loadingProductId = action.meta.arg.productId;
      state.editCart.error = null;
    });
    builder.addCase(removeAddedCartItem_Service.fulfilled, (state, action) => {
      state.editCart.loadingProductId = null;
      state.editCart.error = null;
      if (action.payload.cartDeleted) {
        if (state.cartTab.sessionId === action.payload.sessionId) {
          state.cartTab = initialState.cartTab;
        }
        if (state.activeSession.sessionId === action.payload.sessionId) {
          state.activeSession = initialState.activeSession;
        }
      }
    });
    builder.addCase(removeAddedCartItem_Service.rejected, (state, action) => {
      state.editCart.loadingProductId = null;
      const payload = action.payload as { message?: string } | undefined;
      state.editCart.error =
        payload?.message || action.error.message || 'Could not remove cart item';
    });
  },
});

export const {
  resetAddToCart,
  setActiveSession,
  clearActiveSession,
  clearSessionItems,
  setCartTabSelection,
  clearCartTabSelection,
} = CartSlice.actions;

export default CartSlice.reducer;
