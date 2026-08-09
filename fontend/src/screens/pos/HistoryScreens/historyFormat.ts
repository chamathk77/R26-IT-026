import { CHECKOUT_PAYMENT_OPTIONS } from '../../../type/checkoutPayment';
import { HistoryRecord } from '../../../type/history';

export function formatCheckoutTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getPaymentLabel(value: HistoryRecord['paymentOption']): string {
  return CHECKOUT_PAYMENT_OPTIONS.find((option) => option.id === value)?.label ?? value;
}

export function normalizeHistoryStatus(
  value?: string | null,
): 'submited' | 'reversed' | 'canceled' {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'reversed' || normalized === 'canceled') return normalized;
  return 'submited';
}

export function getHistoryStatusLabel(value?: string | null): string {
  const normalized = normalizeHistoryStatus(value);
  if (normalized === 'reversed') return 'Reversed';
  if (normalized === 'canceled') return 'Canceled';
  return 'Submitted';
}
