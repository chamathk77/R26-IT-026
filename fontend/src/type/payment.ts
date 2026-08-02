export type PaymentStatus = 'pending' | 'approve' | 'rejected' | 'notPaid';

export type PaymentType = 'subscription' | 'upFront' | 'sms';

export type PaymentSubscriptionType = '1month' | '3months' | '6months' | '1year';

export interface AdditionalPaymentItem {
  name: string;
  amount: number;
}

export interface PaymentRecord {
  _id: string;
  shopId: string;
  receiptNumber: string;
  receiptImagePath: string;
  submittedDate: string | null;
  paymentMonth: string | null;
  paymentAmount: number | null;
  additionalPayments?: AdditionalPaymentItem[];
  paymentType: PaymentType;
  subscriptionType?: PaymentSubscriptionType | null;
  exactPaymentDay: string | null;
  expiryDate?: string | null;
  status: PaymentStatus;
  reason: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetPaymentsByShopResponse {
  success: boolean;
  shopId: string;
  count: number;
  payments: PaymentRecord[];
}

export interface GetUpFrontPaymentResponse {
  success: boolean;
  shopId: string;
  payment: PaymentRecord;
}

export interface GetInitialSubscriptionPaymentResponse {
  success: boolean;
  shopId: string;
  shopStatus: string | null;
  subscriptionType: PaymentSubscriptionType | null;
  payment: PaymentRecord;
}

export interface ReverseSubscriptionSelectionResponse {
  success: boolean;
  message: string;
  shopId: string;
  shop: {
    shopId: string;
    status: string | null;
    subscriptionType: PaymentSubscriptionType | null;
    subscriptionReceiptNo: string | null;
  };
  removedPayment?: {
    _id: string;
    receiptNumber: string;
    subscriptionType: PaymentSubscriptionType;
    status: PaymentStatus;
  };
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
