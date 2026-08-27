import axios from 'axios';
import type { CustomerOrderStatus } from '@/lib/api/customerOrders.types';

export function formatLkr(value: number): string {
  return `Rs. ${Number(value ?? 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatOrderTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-LK', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

/** Same rule the API enforces: Sri Lankan 10-digit number starting with 0. */
export function isValidPhone(value: string): boolean {
  return /^0\d{9}$/.test(sanitizePhone(value));
}

export function getCustomerApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    if (!error.response) {
      return 'Could not reach the shop. Check your connection and try again.';
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export const ORDER_STATUS_LABELS: Record<CustomerOrderStatus, string> = {
  waiting_confirmation: 'Waiting for cashier',
  confirmed: 'Confirmed by cashier',
  billed: 'Ready for payment',
  paid: 'Paid',
};

export const ORDER_STATUS_COLORS: Record<
  CustomerOrderStatus,
  'warning' | 'info' | 'secondary' | 'success'
> = {
  waiting_confirmation: 'warning',
  confirmed: 'info',
  billed: 'secondary',
  paid: 'success',
};
