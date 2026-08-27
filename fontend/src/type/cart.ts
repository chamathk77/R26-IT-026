import { Product } from './product';
import type { KitchenTicket } from './kitchen';

export type CartStatus = 'pending' | 'added' | 'proceed';

export type CartOrderType = 'takeaway' | 'dine_in' | 'delivery';

export interface CartOrderMeta {
  orderType?: CartOrderType | null;
  tableId?: string | null;
  orderLabel?: string;
}

export interface CreateCartSessionRequest {
  orderType?: CartOrderType;
  tableId?: string;
  orderLabel?: string;
}

export interface CartOrderItem {
  productId: string;
  name: string;
  quantity: number;
  productNumber?: string | null;
  kitchenSentQuantity?: number;
}

export interface CartOrder {
  sessionId: string;
  items: CartOrderItem[];
  totalPrice: number;
  status: CartStatus;
  user?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartSessionSummary {
  sessionId: string;
  cartNumber?: number;
  shopId?: string;
  branchId?: string;
  status: CartStatus;
  itemCount: number;
  totalAmount: number;
  orderType?: CartOrderType | null;
  tableId?: string | null;
  orderLabel?: string;
  /** 'customer_qr' when the cart started as a customer manual order. */
  source?: 'pos' | 'customer_qr';
  customerPhone?: string;
  customerName?: string;
  customerTableNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartLineItem {
  _id: string;
  user: string;
  sessionId: string;
  cartNumber?: number;
  product: Product | string;
  productName: string;
  productNumber?: string | null;
  quantity: number;
  kitchenSentQuantity?: number;
  totalPrice: number;
  status: CartStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCartSessionResponse {
  success: boolean;
  sessionId: string;
  cartNumber: number;
  status: CartStatus;
  orderType?: CartOrderType | null;
  tableId?: string | null;
  orderLabel?: string;
  message: string;
}

export interface GetCartSessionsResponse {
  success: boolean;
  data: CartSessionSummary[];
  message: string;
}

export interface CartSessionDetailResponse {
  success: boolean;
  data: {
    session: CartSessionSummary;
    items: CartLineItem[];
  };
  message: string;
}

export interface ChangeCartTableRequest {
  tableId: string;
}

export interface ChangeCartTableResponse {
  success: boolean;
  data: {
    session: CartSessionSummary;
    previousTableNumber: string;
    newTableNumber: string;
  };
  message: string;
}

export interface AddCartItemRequest {
  productId: string;
  quantity: number;
  sessionId?: string;
  status?: CartStatus;
}

export interface AddCartItemResponse {
  success: boolean;
  sessionId?: string;
  cartNumber?: number;
  status?: CartStatus;
  data: CartLineItem;
  message: string;
}

export interface GetCartItemsResponse {
  success: boolean;
  data: CartLineItem[];
  message: string;
}

export interface UpdateCartSessionStatusResponse {
  success: boolean;
  sessionId: string;
  status: CartStatus;
  data: CartLineItem[];
  message: string;
}

export interface SendCartToKitchenResponse {
  success: boolean;
  sessionId: string;
  cartNumber: number;
  status: CartStatus;
  orderType?: CartOrderType | null;
  kitchenTicket: KitchenTicket;
  data: CartLineItem[];
  message: string;
}

export interface DeleteCartSessionResponse {
  success: boolean;
  sessionId: string;
  message: string;
}

export interface UpdateAddedCartItemRequest {
  sessionId: string;
  productId: string;
  quantity: number;
}

export interface RemoveAddedCartItemRequest {
  sessionId: string;
  productId: string;
}

export interface MutateCartSessionItemsResponse {
  success: boolean;
  sessionId: string;
  totalPrice: number;
  cartDeleted?: boolean;
  data: CartLineItem[];
  message: string;
}
