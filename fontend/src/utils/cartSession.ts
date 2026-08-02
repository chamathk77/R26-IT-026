import { CartSessionSummary } from '../type/cart';

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
