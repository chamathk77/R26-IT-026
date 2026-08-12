import type { HistoryItem } from '../type/history';

export function formatWarrantyExpiryDate(value?: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatHistoryItemWarranty(item: HistoryItem): string | null {
  if (!item.warrantyMonths || !item.warrantyExpiresAt) {
    return null;
  }

  return `Warranty: ${item.warrantyMonths} mo · valid until ${formatWarrantyExpiryDate(item.warrantyExpiresAt)}`;
}
