import type { BillLineBreakdown } from '../type/billing';
import type { HistoryRecord } from '../type/history';
import { formatCheckoutAmount } from '../type/checkoutPayment';

export function appendHistoryBillingLines(
  lines: string[],
  record: Pick<
    HistoryRecord,
    | 'amount'
    | 'isDiscount'
    | 'discountedAmount'
    | 'taxAmount'
    | 'serviceChargeAmount'
    | 'taxBreakdown'
    | 'serviceChargeBreakdown'
    | 'totalAmount'
  >,
): void {
  lines.push(`Subtotal: ${formatCheckoutAmount(record.amount)}`);

  if (record.isDiscount && Number(record.discountedAmount) > 0) {
    lines.push(`Discount: -${formatCheckoutAmount(record.discountedAmount)}`);
  }

  for (const entry of record.serviceChargeBreakdown ?? []) {
    if (Number(entry.amount) > 0) {
      lines.push(`${entry.label}: ${formatCheckoutAmount(entry.amount)}`);
    }
  }

  if (
    !(record.serviceChargeBreakdown?.length ?? 0) &&
    Number(record.serviceChargeAmount) > 0
  ) {
    lines.push(`Service charge: ${formatCheckoutAmount(record.serviceChargeAmount ?? 0)}`);
  }

  for (const entry of record.taxBreakdown ?? []) {
    if (Number(entry.amount) > 0) {
      lines.push(`${entry.label}: ${formatCheckoutAmount(entry.amount)}`);
    }
  }

  if (!(record.taxBreakdown?.length ?? 0) && Number(record.taxAmount) > 0) {
    lines.push(`Tax: ${formatCheckoutAmount(record.taxAmount ?? 0)}`);
  }

  lines.push(`Total: ${formatCheckoutAmount(record.totalAmount)}`);
}

export function getEnabledBillingLines(record: HistoryRecord): BillLineBreakdown[] {
  const serviceLines = record.serviceChargeBreakdown ?? [];
  const taxLines = record.taxBreakdown ?? [];
  return [...serviceLines, ...taxLines].filter((entry) => Number(entry.amount) > 0);
}

export function hasHistoryBillingAdjustments(record: HistoryRecord): boolean {
  return (
    Number(record.serviceChargeAmount) > 0 ||
    Number(record.taxAmount) > 0 ||
    (record.isDiscount && Number(record.discountedAmount) > 0)
  );
}
