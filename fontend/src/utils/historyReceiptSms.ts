import type { HistoryItem } from '../type/history';
import { formatWarrantyExpiryDate } from './warranty';

export function formatHistoryItemWarrantySms(item: HistoryItem): string | null {
  if (!item.warrantyMonths || !item.warrantyExpiresAt) {
    return null;
  }

  return `Warranty ${item.warrantyMonths}mo until ${formatWarrantyExpiryDate(item.warrantyExpiresAt)}`;
}

export function countWarrantyHistoryItems(items: HistoryItem[]): number {
  return items.filter((item) => item.warrantyMonths && item.warrantyExpiresAt).length;
}
