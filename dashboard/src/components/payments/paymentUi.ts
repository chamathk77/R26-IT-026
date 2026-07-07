export function formatPaymentAmount(amount?: number | null): string {
  if (amount == null) return '—';
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

export function formatPaymentTypeLabel(paymentType?: string | null): string {
  if (!paymentType) return '—';
  if (paymentType === 'upFront') return 'Upfront';
  if (paymentType === 'sms') return 'SMS';
  return 'Subscription';
}

export function getPaymentStatusColor(
  status: string,
): 'warning' | 'success' | 'error' | 'default' | 'info' {
  if (status === 'pending') return 'warning';
  if (status === 'approve') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'notPaid') return 'info';
  return 'default';
}

export function formatPaymentStatusLabel(status: string): string {
  if (status === 'notPaid') return 'Not paid';
  if (status === 'approve') return 'Approved';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function isUpFrontPayment(paymentType?: string | null): boolean {
  if (!paymentType) return false;
  const normalized = paymentType.trim().toLowerCase();
  return normalized === 'upfront';
}

export function isSubscriptionPayment(paymentType?: string | null): boolean {
  if (!paymentType) return false;
  return paymentType.trim().toLowerCase() === 'subscription';
}
