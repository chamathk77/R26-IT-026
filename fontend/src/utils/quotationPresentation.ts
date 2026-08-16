import type { QuotationStatus } from '../type/quotation';

export const QUOTATION_STATUS_STYLE: Record<QuotationStatus, { bg: string; text: string; pdfBg: string }> = {
  draft: { bg: '#f1f5f9', text: '#475569', pdfBg: '#f1f5f9' },
  sent: { bg: '#dbeafe', text: '#1d4ed8', pdfBg: '#dbeafe' },
  accepted: { bg: '#dcfce7', text: '#15803d', pdfBg: '#dcfce7' },
  expired: { bg: '#ffedd5', text: '#c2410c', pdfBg: '#ffedd5' },
  cancelled: { bg: '#fee2e2', text: '#b91c1c', pdfBg: '#fee2e2' },
};

export const QUOTATION_BRAND = {
  primary: '#1565c0',
  primaryDark: '#0d47a1',
  primaryLight: '#e3f2fd',
  ink: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  surface: '#f8fafc',
};

export function formatQuotationDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getQuotationStatusStyle(status: QuotationStatus) {
  return QUOTATION_STATUS_STYLE[status] ?? QUOTATION_STATUS_STYLE.draft;
}

export function formatQuotationDiscountLabel(record: {
  isDiscount?: boolean;
  discountType?: 'amount' | 'percent';
  discount?: number;
}): string {
  if (!record.isDiscount) return 'Discount';
  if (record.discountType === 'percent') {
    return `Discount (${record.discount ?? 0}%)`;
  }
  return 'Discount';
}
