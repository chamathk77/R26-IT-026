import { api } from './axios';
import type { PaymentDetailsResponse, PendingPaymentsResponse } from './payments.types';

export async function fetchPendingPayments(): Promise<PendingPaymentsResponse> {
  const response = await api.get<PendingPaymentsResponse>('/api/dashboard/payments/pending');
  return response.data;
}

export async function fetchPaymentDetails(paymentId: string): Promise<PaymentDetailsResponse> {
  const response = await api.get<PaymentDetailsResponse>(`/api/dashboard/payments/${paymentId}`);
  return response.data;
}
