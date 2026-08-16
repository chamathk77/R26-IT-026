import type { LoginShop } from '../type/auth';
import type { CartOrderType } from '../type/cart';
import { formatCartOrderStatus } from './cartSession';
import { hasTableManagement, isRestaurantShop } from './industryHelper';

export function formatHistoryOrderTypeLabel(
  record: {
    orderType?: CartOrderType | string | null;
    orderLabel?: string | null;
  },
  shop: LoginShop | null | undefined,
): string {
  if (!isRestaurantShop(shop) || !record.orderType) {
    return '';
  }

  return formatCartOrderStatus(record.orderType as CartOrderType, record.orderLabel, {
    showTableManagement: hasTableManagement(shop),
  });
}
