import { CartSessionSummary } from '../type/cart';

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
