import type { BillLineBreakdown } from './billing';

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'expired' | 'cancelled';

export interface QuotationItem {
  productId: string;
  productName: string;
  qty: number;
  unitCost: number | null;
}

export interface QuotationRecord {
  _id: string;
  shopId: string;
  branchId: string;
  quotationNumber: string;
  customerName: string;
  customerMobile: string;
  items: QuotationItem[];
  subtotal: number;
  isDiscount?: boolean;
  discountType?: 'amount' | 'percent';
  discount?: number;
  discountAmount?: number;
  includeTaxes: boolean;
  taxAmount: number;
  taxBreakdown: BillLineBreakdown[];
  billingSnapshot?: unknown;
  totalAmount: number;
  notes: string;
  status: QuotationStatus;
  validUntil?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotationItemInput {
  productId: string;
  qty: number;
  unitCost?: number | null;
}

export interface CreateQuotationRequest {
  customerName?: string;
  customerMobile?: string;
  items: QuotationItemInput[];
  includeTaxes?: boolean;
  isDiscount?: boolean;
  discountType?: 'amount' | 'percent';
  discount?: number;
  notes?: string;
  status?: QuotationStatus;
  validUntil?: string | null;
}

export interface UpdateQuotationRequest {
  id: string;
  customerName?: string;
  customerMobile?: string;
  items?: QuotationItemInput[];
  includeTaxes?: boolean;
  notes?: string;
  status?: QuotationStatus;
  validUntil?: string | null;
}

export interface QuotationListResponse {
  success: boolean;
  count: number;
  data: QuotationRecord[];
}

export interface QuotationResponse {
  success: boolean;
  message?: string;
  data: QuotationRecord;
}

export interface DraftQuotationLine {
  productId: string;
  productName: string;
  type: 'product' | 'service';
  qty: number;
  unitCost: number;
}
