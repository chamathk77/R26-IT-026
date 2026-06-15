import { Ionicons } from '@expo/vector-icons';

/** POS cart checkout payment — not shop subscription billing. */
export type CheckoutPaymentMethod = 'cash' | 'card' | 'online';

export type CheckoutCustomerDetails = {
  name: string;
  phone: string;
};

export const EMPTY_CHECKOUT_CUSTOMER: CheckoutCustomerDetails = {
  name: '',
  phone: '',
};

export function sanitizeCheckoutPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}

export type CheckoutPaymentOption = {
  id: CheckoutPaymentMethod;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const CHECKOUT_PAYMENT_OPTIONS: CheckoutPaymentOption[] = [
  {
    id: 'cash',
    label: 'Cash',
    description: 'Pay with cash at the counter',
    icon: 'cash-outline',
  },
  {
    id: 'card',
    label: 'Card',
    description: 'Debit or credit card payment',
    icon: 'card-outline',
  },
  {
    id: 'online',
    label: 'Online payment',
    description: 'Pay via online transfer or wallet',
    icon: 'phone-portrait-outline',
  },
];

export function formatCheckoutAmount(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
