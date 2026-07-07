export interface PaymentShopSummary {
  shopId: string;
  shopName: string;
  ownerFirstName: string;
  ownerLastName: string;
  shopMobileNumber: string;
  email: string;
  status: string;
  subscriptionDueDays?: number;
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
  receiptImageAvailable?: boolean;
  submittedDate?: string | null;
  paymentMonth?: string | null;
  paymentAmount?: number | null;
  paymentType?: string;
  subscriptionType?: string | null;
  IsOnboaringPayment?: boolean;
  shopStatus?: string | null;
  subscriptionDueDays?: number;
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

export type PaymentTypeFilter = 'subscription' | 'upFront' | 'sms';

export type OnboardingPaymentTypeFilter = 'subscription' | 'upFront';

export type PaymentStatusFilter = 'pending' | 'approve' | 'rejected' | 'notPaid';

export interface FetchPendingPaymentsParams {
  page?: number;
  limit?: number;
  paymentType?: PaymentTypeFilter | '';
}

export interface FetchOnboardingPaymentsParams {
  page?: number;
  limit?: number;
  paymentType?: OnboardingPaymentTypeFilter | '';
  status?: PaymentStatusFilter | '';
}

export interface FetchSubscriptionPaymentsParams {
  page?: number;
  limit?: number;
  status?: PaymentStatusFilter | '';
}

export interface PendingPaymentsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  count: number;
  paymentType?: PaymentTypeFilter | null;
  allowedPaymentTypes?: PaymentTypeFilter[];
  payments: PendingPayment[];
}

export interface OnboardingPaymentsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  count: number;
  paymentType?: OnboardingPaymentTypeFilter | null;
  status?: PaymentStatusFilter | null;
  allowedPaymentTypes?: OnboardingPaymentTypeFilter[];
  allowedStatuses?: PaymentStatusFilter[];
  payments: PendingPayment[];
}

export interface SubscriptionPaymentsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  count: number;
  status?: PaymentStatusFilter | null;
  allowedStatuses?: PaymentStatusFilter[];
  payments: PendingPayment[];
}

export interface PaymentDetailsResponse {
  success: boolean;
  payment: PaymentRecord;
  shop: ShopDetails | null;
}

export interface PaymentActionResponse {
  success: boolean;
  message: string;
  payment: PaymentRecord;
  shop: ShopDetails | null;
  usersLoggedOut?: number;
}
