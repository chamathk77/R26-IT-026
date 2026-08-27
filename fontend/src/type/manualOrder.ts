import type { CartOrderType, CartSessionSummary } from './cart';

export interface ManualOrderItem {
  productId: string;
  name: string;
  productNumber?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** A customer QR order waiting for cashier review (cart status 'manual'). */
export interface ManualOrder {
  sessionId: string;
  cartNumber: number;
  shopId: string;
  branchId: string;
  status: 'manual';
  source: 'pos' | 'customer_qr';
  customerPhone: string;
  customerName: string;
  tableNumber: string;
  orderType?: CartOrderType | null;
  orderLabel: string;
  tableId?: string | null;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  items: ManualOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GetManualOrdersResponse {
  success: boolean;
  shopId: string;
  branchId: string;
  count: number;
  data: ManualOrder[];
  message: string;
}

export interface GetManualOrderCountResponse {
  success: boolean;
  shopId: string;
  branchId: string;
  data: { count: number };
  message: string;
}

export interface AcceptManualOrderResponse {
  success: boolean;
  data: {
    session: CartSessionSummary;
    tableWarning: string | null;
  };
  message: string;
}

export interface RejectManualOrderResponse {
  success: boolean;
  data: { sessionId: string; cartNumber: number };
  message: string;
}

export interface BranchOrderQr {
  shopId: string;
  shopName: string;
  branchId: string;
  branchName: string;
  orderUrl: string;
  configured: boolean;
}

export interface GetBranchOrderQrResponse {
  success: boolean;
  data: BranchOrderQr;
  message: string;
}
