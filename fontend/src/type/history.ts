export interface HistoryItem {
  productId: string;
  name: string;
  quantity: number;
}

export type HistoryDiscountType = 'amount' | 'percent';

export interface HistoryDiscount {
  enabled: boolean;
  type: HistoryDiscountType | null;
  value: number | null;
  amount: number;
}

export interface HistoryHandledUser {
  _id: string;
  name: string;
  email?: string;
}

export interface HistoryRecord {
  _id: string;
  handledUser: HistoryHandledUser | string;
  cartSessionId: string;
  items: HistoryItem[];
  subtotalPrice?: number;
  discount?: HistoryDiscount;
  totalPrice: number;
  checkoutAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutDiscountRequest {
  enabled: boolean;
  type: 'amount' | 'percent';
  value: number;
}

export interface CheckoutCartRequest {
  sessionId: string;
  discount?: CheckoutDiscountRequest;
}

export type HistoryScope = 'mine' | 'all';

export interface GetHistoryResponse {
  success: boolean;
  scope: HistoryScope;
  data: HistoryRecord[];
  message: string;
}

export interface CheckoutCartResponse {
  success: boolean;
  sessionId: string;
  status: 'proceed';
  data: HistoryRecord;
  message: string;
}
