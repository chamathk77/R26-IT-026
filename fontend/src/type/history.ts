export interface HistoryItem {
  productId: string;
  name: string;
  quantity: number;
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
  totalPrice: number;
  checkoutAt: string;
  createdAt?: string;
  updatedAt?: string;
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
