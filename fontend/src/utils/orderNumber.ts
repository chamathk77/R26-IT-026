/** Customer-facing order number — always prefer branch cart # over internal orderId. */
export function formatDisplayOrderNumber(
  cartNumber: number | null | undefined,
  orderId?: string | null,
): string {
  if (cartNumber != null && cartNumber > 0) {
    return `#${cartNumber}`;
  }

  const trimmed = orderId?.trim();
  return trimmed ? trimmed : '—';
}
