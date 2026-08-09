import {
  AdditionalPaymentItem,
  PaymentRecord,
  PaymentSubscriptionType,
} from '../type/payment';

const SUBSCRIPTION_TYPE_LABELS: Record<PaymentSubscriptionType, string> = {
  '1month': 'Monthly subscription plan',
  '3months': 'Quarterly subscription plan',
  '6months': 'Half-year subscription plan',
  '1year': 'Annual subscription plan',
};

export interface PaymentLineItem {
  name: string;
  amount: number;
}

export function formatPaymentAmount(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function getBaseLineItemName(payment: PaymentRecord): string {
  if (payment.paymentType === 'upFront') {
    return 'Up-front payment';
  }

  if (payment.paymentType === 'sms') {
    return 'SMS package billing';
  }

  if (payment.subscriptionType) {
    return SUBSCRIPTION_TYPE_LABELS[payment.subscriptionType] ?? 'Subscription plan';
  }

  if (payment.paymentMonth) {
    const month =
      payment.paymentMonth.charAt(0).toUpperCase() + payment.paymentMonth.slice(1);
    return `${month} subscription`;
  }

  return 'Subscription plan';
}

export function getAdditionalPayments(payment: PaymentRecord): AdditionalPaymentItem[] {
  return payment.additionalPayments ?? [];
}

export function getAdditionalPaymentsTotal(payment: PaymentRecord): number {
  return getAdditionalPayments(payment).reduce((sum, item) => sum + item.amount, 0);
}

export function getPaymentLineItems(payment: PaymentRecord): PaymentLineItem[] {
  const additionalPayments = getAdditionalPayments(payment);
  const additionalTotal = additionalPayments.reduce((sum, item) => sum + item.amount, 0);
  const totalAmount = payment.paymentAmount ?? 0;
  const baseAmount = Math.max(0, totalAmount - additionalTotal);

  const items: PaymentLineItem[] = [
    {
      name: getBaseLineItemName(payment),
      amount: baseAmount,
    },
  ];

  for (const item of additionalPayments) {
    items.push(item);
  }

  return items;
}

export function hasPaymentBreakdown(payment: PaymentRecord): boolean {
  return getAdditionalPayments(payment).length > 0;
}

export function hasSubmittedDate(submittedDate: string | null | undefined): boolean {
  if (!submittedDate || String(submittedDate).trim() === '') {
    return false;
  }

  const parsed = new Date(submittedDate);
  return !Number.isNaN(parsed.getTime());
}

export function formatSubmittedDate(submittedDate: string | null | undefined): string {
  if (!hasSubmittedDate(submittedDate)) {
    return 'Not submitted yet';
  }

  const parsed = new Date(submittedDate!);
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatSubmittedDateTime(submittedDate: string | null | undefined): string {
  if (!hasSubmittedDate(submittedDate)) {
    return 'Not submitted yet';
  }

  const parsed = new Date(submittedDate!);
  return parsed.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
