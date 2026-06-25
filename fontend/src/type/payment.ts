export type PaymentStatus = 'pending' | 'approve' | 'rejected' | 'notPaid';

export type PaymentType = 'subscription' | 'upFront';

export type PaymentSubscriptionType = '1month' | '3months' | '6months' | '1year';

export interface PaymentRecord {
  _id: string;
  shopId: string;
  receiptNumber: string;
  receiptImagePath: string;
  submittedDate: string;
  paymentMonth: string | null;
  paymentAmount: number | null;
  paymentType: PaymentType;
  subscriptionType?: PaymentSubscriptionType | null;
  exactPaymentDay: string | null;
  expiryDate?: string | null;
  status: PaymentStatus;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetPaymentsByShopResponse {
  success: boolean;
  shopId: string;
  count: number;
  payments: PaymentRecord[];
}

export interface SubmitPaymentReceiptResponse {
  success: boolean;
  message: string;
  payment: PaymentRecord;
  shop?: {
    shopId: string;
    status: string | null;
  };
}

export interface PaymentSubmitRequest {
  paymentId: string;
  imageUri: string;
}
