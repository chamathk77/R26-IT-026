export interface ShopTaxConfig {
  id: string;
  label: string;
  rate: number;
  enabled: boolean;
}

export interface ShopBillingConfig {
  taxes: ShopTaxConfig[];
}

export interface BillLineBreakdown {
  id: string;
  label: string;
  amount: number;
  rate?: number;
}

export interface BillTotalsPreview {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxBreakdown: BillLineBreakdown[];
  totalAmount: number;
  /** @deprecated Always 0 — kept for older history records */
  serviceChargeAmount?: number;
  /** @deprecated Always [] — kept for older history records */
  serviceChargeBreakdown?: BillLineBreakdown[];
}
