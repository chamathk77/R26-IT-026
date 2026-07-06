export interface PaymentShopSummary {
  shopId: string;
  shopName: string;
  ownerFirstName: string;
  ownerLastName: string;
  shopMobileNumber: string;
  email: string;
  status: string;
}

export interface AdditionalPaymentItem {
  name: string;
  amount: number;
}

export interface PendingPayment {
  _id: string;
  shopId: string;
  receiptNumber: string;
  receiptImagePath?: string;
  receiptImageUrl?: string | null;
  submittedDate?: string | null;
  paymentMonth?: string | null;
  paymentAmount?: number | null;
  paymentType?: string;
  subscriptionType?: string | null;
  exactPaymentDay?: string | null;
  expiryDate?: string | null;
  status: string;
  reason?: string | null;
  description?: string | null;
  additionalPayments?: AdditionalPaymentItem[];
  createdAt: string;
  updatedAt: string;
  shop: PaymentShopSummary | null;
}

export interface PaymentRecord extends Omit<PendingPayment, 'shop'> {}

export interface ShopDetails {
  shopId?: string;
  shopName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  shopMobileNumber?: string;
  email?: string;
  status?: string;
  subscriptionType?: string | null;
  nextPaymentDate?: string | null;
  [key: string]: unknown;
}

export interface PendingPaymentsResponse {
  success: boolean;
  count: number;
  payments: PendingPayment[];
}

export interface PaymentDetailsResponse {
  success: boolean;
  payment: PaymentRecord;
  shop: ShopDetails | null;
}
