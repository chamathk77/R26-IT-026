import { Product } from './product';

export type CartStatus = 'pending' | 'added' | 'proceed';

export interface CartOrderItem {
  productId: string;
  name: string;
  quantity: number;
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
  status: CartStatus;
  itemCount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartLineItem {
  _id: string;
  user: string;
  sessionId: string;
  product: Product | string;
  productName: string;
  quantity: number;
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
  message: string;
}

export interface GetCartSessionsResponse {
  success: boolean;
  data: CartSessionSummary[];
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
