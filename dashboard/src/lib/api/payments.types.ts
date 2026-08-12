export interface PaymentShopSummary {
  shopId: string;
  shopName: string;
  ownerFirstName: string;
  ownerLastName: string;
  shopMobileNumber: string;
  email: string;
  status: string;
  subscriptionDueDays?: number;
  subscriptionType?: string | null;
  isSubscriptionChangePending?: boolean;
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
  isSubscriptionChangePending?: boolean;
  shopSubscriptionType?: string | null;
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
  isSubscriptionChangePending?: boolean;
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

export interface FetchSmsPaymentsParams {
  page?: number;
  limit?: number;
  status?: PaymentStatusFilter | '';
  shopId?: string;
}

export interface SmsPaymentShopSummary {
  shopId: string;
  shopName: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerMobileNumber?: string;
  shopMobileNumber: string;
  email: string;
  status: string;
  smsFeatureStatus?: string | null;
  smsDueDays?: number;
  smsPackageType?: string | null;
  smsReceiptNo?: string | null;
  isSmsFeatureActive?: boolean;
}

export interface SmsPaymentListItem {
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
  exactPaymentDay?: string | null;
  expiryDate?: string | null;
  status: string;
  reason?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  shop: SmsPaymentShopSummary | null;
}

export interface SmsShopDetails extends ShopDetails {
  ownerMobileNumber?: string;
  smsFeatureStatus?: string | null;
  smsDueDays?: number;
  smsPackageType?: string | null;
  smsReceiptNo?: string | null;
  isSmsFeatureActive?: boolean;
  smsNextRenewalDate?: string | null;
}

export interface SmsPaymentsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  count: number;
  paymentType?: 'sms';
  status?: PaymentStatusFilter | null;
  allowedStatuses?: PaymentStatusFilter[];
  payments: SmsPaymentListItem[];
}

export interface SmsPaymentDetailsResponse {
  success: boolean;
  payment: PaymentRecord;
  shop: SmsShopDetails | null;
}

export interface SmsPaymentActionResponse {
  success: boolean;
  message: string;
  payment: PaymentRecord;
  shop: SmsShopDetails | null;
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

export interface GenerateUpfrontConfirmationPayload {
  shopId: string;
  shopName: string;
  address: string;
  shopMobileNumber: string;
  paymentAmount: number;
  description?: string;
}

export interface GenerateUpfrontConfirmationResponse {
  success: boolean;
  message: string;
  payment: PaymentRecord;
  shop: ShopDetails | null;
}

export interface ManualPaymentConfirmation {
  _id: string;
  receiptNumber: string;
  productName: string;
  shopName: string;
  address: string;
  shopMobileNumber: string;
  paymentAmount: number;
  paymentMethod: string;
  paymentReceivedDate: string;
  description: string | null;
  notes: string | null;
  generatedByUserId: string | null;
  generatedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateManualPaymentConfirmationPayload {
  productName: string;
  shopName: string;
  address: string;
  shopMobileNumber: string;
  paymentAmount: number;
  paymentMethod?: string;
  paymentReceivedDate?: string;
  description?: string;
  notes?: string;
}

export interface CreateManualPaymentConfirmationResponse {
  success: boolean;
  message: string;
  confirmation: ManualPaymentConfirmation;
}

export interface ManualPaymentConfirmationsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  count: number;
  confirmations: ManualPaymentConfirmation[];
}

export interface ManualPaymentConfirmationDetailsResponse {
  success: boolean;
  confirmation: ManualPaymentConfirmation;
}
