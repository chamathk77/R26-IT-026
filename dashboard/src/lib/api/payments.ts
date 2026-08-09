import axios from 'axios';
import { api } from './axios';
import type {
  FetchOnboardingPaymentsParams,
  FetchPendingPaymentsParams,
  FetchSmsPaymentsParams,
  FetchSubscriptionPaymentsParams,
  OnboardingPaymentsResponse,
  PaymentActionResponse,
  PaymentDetailsResponse,
  PendingPaymentsResponse,
  SmsPaymentActionResponse,
  SmsPaymentDetailsResponse,
  SmsPaymentsResponse,
  SubscriptionPaymentsResponse,
} from './payments.types';

interface ApiErrorBody {
  message?: string;
}

export function getPaymentActionErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? 'Payment action failed. Please try again.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Payment action failed. Please try again.';
}

export async function fetchPendingPayments(
  params: FetchPendingPaymentsParams = {},
): Promise<PendingPaymentsResponse> {
  const response = await api.get<PendingPaymentsResponse>('/api/dashboard/payments/pending', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.paymentType ? { paymentType: params.paymentType } : {}),
    },
  });
  return response.data;
}

export async function fetchOnboardingPayments(
  params: FetchOnboardingPaymentsParams = {},
): Promise<OnboardingPaymentsResponse> {
  const response = await api.get<OnboardingPaymentsResponse>(
    '/api/dashboard/payments/onboarding',
    {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...(params.paymentType ? { paymentType: params.paymentType } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    },
  );
  return response.data;
}

export async function fetchSubscriptionPayments(
  params: FetchSubscriptionPaymentsParams = {},
): Promise<SubscriptionPaymentsResponse> {
  const response = await api.get<SubscriptionPaymentsResponse>(
    '/api/dashboard/payments/subscription',
    {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...(params.status ? { status: params.status } : {}),
      },
    },
  );
  return response.data;
}

export async function fetchSmsPayments(
  params: FetchSmsPaymentsParams = {},
): Promise<SmsPaymentsResponse> {
  const response = await api.get<SmsPaymentsResponse>('/api/dashboard/sms-billing', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.status ? { status: params.status } : {}),
      ...(params.shopId ? { shopId: params.shopId } : {}),
    },
  });
  return response.data;
}

export async function fetchSmsPaymentDetails(
  paymentId: string,
): Promise<SmsPaymentDetailsResponse> {
  const response = await api.get<SmsPaymentDetailsResponse>(
    `/api/dashboard/sms-billing/${paymentId}`,
  );
  return response.data;
}

export async function approveSmsBill(paymentId: string): Promise<SmsPaymentActionResponse> {
  const response = await api.post<SmsPaymentActionResponse>(
    `/api/dashboard/sms-billing/${paymentId}/approve`,
  );
  return response.data;
}

export async function rejectSmsBill(
  paymentId: string,
  reason: string,
): Promise<SmsPaymentActionResponse> {
  const response = await api.post<SmsPaymentActionResponse>(
    `/api/dashboard/sms-billing/${paymentId}/reject`,
    { reason },
  );
  return response.data;
}

export async function resetAndApproveSmsBill(
  paymentId: string,
): Promise<SmsPaymentActionResponse> {
  const response = await api.post<SmsPaymentActionResponse>(
    `/api/dashboard/sms-billing/${paymentId}/reset-and-approve`,
  );
  return response.data;
}

export async function fetchPaymentDetails(paymentId: string): Promise<PaymentDetailsResponse> {
  const response = await api.get<PaymentDetailsResponse>(`/api/dashboard/payments/${paymentId}`);
  return response.data;
}

export async function approveUpfrontPayment(paymentId: string): Promise<PaymentActionResponse> {
  const response = await api.post<PaymentActionResponse>(
    `/api/dashboard/payments/${paymentId}/approve-upfront`,
  );
  return response.data;
}

export async function rejectUpfrontPayment(
  paymentId: string,
  reason: string,
): Promise<PaymentActionResponse> {
  const response = await api.post<PaymentActionResponse>(
    `/api/dashboard/payments/${paymentId}/reject-upfront`,
    { reason },
  );
  return response.data;
}

export async function approveFirstMultiMonthSubscriptionPayment(
  paymentId: string,
): Promise<PaymentActionResponse> {
  const response = await api.post<PaymentActionResponse>(
    `/api/dashboard/payments/${paymentId}/approve-first-multi-month-subscription`,
  );
  return response.data;
}

export async function rejectFirstMultiMonthSubscriptionPayment(
  paymentId: string,
  reason: string,
): Promise<PaymentActionResponse> {
  const response = await api.post<PaymentActionResponse>(
    `/api/dashboard/payments/${paymentId}/reject-first-multi-month-subscription`,
    { reason },
  );
  return response.data;
}

export async function approveSubscriptionPayment(
  paymentId: string,
): Promise<PaymentActionResponse> {
  const response = await api.post<PaymentActionResponse>(
    `/api/dashboard/payments/${paymentId}/approve-subscription`,
  );
  return response.data;
}

export async function rejectSubscriptionPayment(
  paymentId: string,
  reason: string,
): Promise<PaymentActionResponse> {
  const response = await api.post<PaymentActionResponse>(
    `/api/dashboard/payments/${paymentId}/reject-subscription`,
    { reason },
  );
  return response.data;
}

export async function resetAndApproveSubscriptionPayment(
  paymentId: string,
): Promise<PaymentActionResponse> {
  const response = await api.post<PaymentActionResponse>(
    `/api/dashboard/payments/${paymentId}/reset-and-approve-subscription`,
  );
  return response.data;
}
