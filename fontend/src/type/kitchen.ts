import { CartOrderType } from './cart';

export type KitchenTicketStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

export type KitchenTicketItem = {
  productId: string;
  name: string;
  productNumber?: string | null;
  quantity: number;
};

export type KitchenTicket = {
  _id: string;
  shopId: string;
  branchId: string;
  sessionId: string;
  cartNumber: number;
  ticketNumber: number;
  orderType?: CartOrderType | null;
  orderLabel?: string;
  tableId?: string | null;
  items: KitchenTicketItem[];
  status: KitchenTicketStatus;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type GetKitchenTicketsResponse = {
  success: boolean;
  shopId: string;
  branchId: string;
  count: number;
  data: KitchenTicket[];
  message: string;
};

export type UpdateKitchenTicketStatusResponse = {
  success: boolean;
  data: KitchenTicket;
  message: string;
};

export type KitchenStatusFilter = 'all_open' | KitchenTicketStatus;
