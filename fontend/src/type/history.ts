import { CheckoutPaymentMethod } from './checkoutPayment';

export type HistoryPaymentOption = CheckoutPaymentMethod;
export type HistoryStatus = 'submited' | 'reversed' | 'canceled';

export interface HistoryItem {
  productId: string;
  productName: string;
  qty: number;
  unitCost: number | null;
}

export interface HistoryRecord {
  _id: string;
  shopId: string;
  cartId: string;
  cartNumber: number;
  orderId?: string;
  checkOutTime: string;
  amount: number;
  isDiscount: boolean;
  discountedAmount: number;
  items: HistoryItem[];
  totalAmount: number;
  customerName: string;
  customerMobile: string;
  userId: string;
  submittedUserId: string;
  submittedUserName: string;
  paymentOption: HistoryPaymentOption;
  status?: HistoryStatus | 'submitted';
  isReversed?: boolean;
  reversedAt?: string | null;
  reversedUserId?: string | null;
  reversedUserName?: string | null;
  salesPersonId?: string | null;
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
  isDiscount?: boolean;
  itemUnitCosts?: Record<string, number>;
  discountedAmount?: number;
  discount?: CheckoutDiscountRequest;
}

export interface CompleteCheckoutRequest extends CheckoutCartRequest {
  customerName?: string;
  customerMobile: string;
  paymentOption: HistoryPaymentOption;
}

export interface CreateHistoryRequest {
  sessionId: string;
  customerName?: string;
  customerMobile: string;
  paymentOption: HistoryPaymentOption;
  salesPersonId?: string;
}

export interface CreateHistoryResponse {
  success: boolean;
  sessionId: string;
  data: HistoryRecord;
  message: string;
}

export interface CheckoutCartSessionResponse {
  success: boolean;
  sessionId: string;
  cartNumber: number;
  status: string;
  isDiscount: boolean;
  discountedAmount: number;
  totalPrice: number;
  message: string;
}

export interface CompleteCheckoutResponse {
  sessionId: string;
  cartNumber: number | null;
  history: HistoryRecord;
}

export type HistoryScope = 'mine' | 'all';

export interface HistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface HistoryFilters {
  scope?: HistoryScope;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  paymentOption?: HistoryPaymentOption | '';
  orderId?: string;
  mobile?: string;
  append?: boolean;
}

export interface GetHistoryResponse {
  success: boolean;
  scope: HistoryScope;
  data: HistoryRecord[];
  pagination: HistoryPagination;
  message: string;
}

export interface ReverseHistoryRequest {
  id: string;
  status: 'reversed' | 'canceled';
}

export interface ReverseHistoryResponse {
  success: boolean;
  data: HistoryRecord;
  message: string;
}

export interface ResendBillSmsRequest {
  id: string;
  customerMobile: string;
}

export interface ResendBillSmsResponse {
  success: boolean;
  data: HistoryRecord;
  message: string;
}

/** @deprecated Use CompleteCheckoutResponse */
export interface CheckoutCartResponse {
  success: boolean;
  sessionId: string;
  status: 'proceed';
  data: HistoryRecord;
  message: string;
}
