import { CartSessionSummary, CreateCartSessionResponse, CartOrderType } from '../type/cart';

export function mapToActiveSession(
  session: Pick<
    CreateCartSessionResponse | CartSessionSummary,
    'sessionId' | 'cartNumber' | 'orderType' | 'tableId' | 'orderLabel'
  >,
) {
  return {
    sessionId: session.sessionId,
    cartNumber: session.cartNumber ?? null,
    orderType: session.orderType ?? null,
    tableId: session.tableId ? String(session.tableId) : null,
    orderLabel: session.orderLabel ?? '',
  };
}

export function getCartOrderTypeLabel(orderType?: CartOrderType | null): string {
  if (orderType === 'takeaway') return 'Takeaway';
  if (orderType === 'dine_in') return 'Dine-in';
  if (orderType === 'delivery') return 'Delivery';
  return '';
}

export function formatCartOrderStatus(
  orderType?: CartOrderType | null,
  orderLabel?: string | null,
  options?: { showTableManagement?: boolean },
): string {
  const typeLabel = getCartOrderTypeLabel(orderType);
  if (!typeLabel) return '';

  const showTableManagement = options?.showTableManagement ?? false;
  if (
    showTableManagement &&
    orderType === 'dine_in' &&
    orderLabel?.trim() &&
    orderLabel.trim() !== typeLabel
  ) {
    return `${typeLabel} · ${orderLabel.trim()}`;
  }

  return typeLabel;
}

export function normalizeShopId(shopId: string | null | undefined): string {
  return shopId?.trim().toUpperCase() ?? '';
}

/** Client-side guard: only added carts for the logged-in shop. */
export function filterAddedSessionsForShop(
  sessions: CartSessionSummary[],
  shopId: string | null | undefined,
): CartSessionSummary[] {
  const normalizedShopId = normalizeShopId(shopId);
  if (!normalizedShopId) return [];

  return sessions.filter((session) => {
    if (session.status !== 'added') return false;
    if (!session.shopId) return true;
    return normalizeShopId(session.shopId) === normalizedShopId;
  });
}

export function isAddedSessionForShop(
  session: CartSessionSummary,
  shopId: string | null | undefined,
): boolean {
  return filterAddedSessionsForShop([session], shopId).length > 0;
}

export function sortCartSessionsByNumber(
  sessions: CartSessionSummary[],
): CartSessionSummary[] {
  return [...sessions].sort((left, right) => {
    const leftNumber = left.cartNumber ?? Number.MAX_SAFE_INTEGER;
    const rightNumber = right.cartNumber ?? Number.MAX_SAFE_INTEGER;
    if (leftNumber !== rightNumber) return leftNumber - rightNumber;
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

export function getCartNumberForSession(
  sessions: CartSessionSummary[],
  sessionId: string,
): number | null {
  const match = sessions.find((session) => session.sessionId === sessionId);
  if (match?.cartNumber != null) return match.cartNumber;

  const sorted = sortCartSessionsByNumber(sessions);
  const index = sorted.findIndex((session) => session.sessionId === sessionId);
  return index >= 0 ? index + 1 : null;
}
