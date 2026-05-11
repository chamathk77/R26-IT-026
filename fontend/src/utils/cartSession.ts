import { CartSessionSummary } from '../type/cart';

export function sortCartSessionsOldestFirst(
  sessions: CartSessionSummary[],
): CartSessionSummary[] {
  return [...sessions].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export function getCartNumberForSession(
  sessions: CartSessionSummary[],
  sessionId: string,
): number | null {
  const sorted = sortCartSessionsOldestFirst(sessions);
  const index = sorted.findIndex((session) => session.sessionId === sessionId);
  return index >= 0 ? index + 1 : null;
}
