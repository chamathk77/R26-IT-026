import { getApiBaseUrl } from '../../../../config/apiConfig';
import { LoginShop } from '../../../type/auth';
import { formatCheckoutAmount } from '../../../type/checkoutPayment';
import { HistoryRecord } from '../../../type/history';
import {
  formatCheckoutTime,
  getHistoryStatusLabel,
  getPaymentLabel,
  normalizeHistoryStatus,
} from './historyFormat';
import { formatDisplayOrderNumber } from '../../../utils/orderNumber';
import { formatHistoryItemWarrantySms } from '../../../utils/historyReceiptSms';
import { formatHistoryItemWarranty } from '../../../utils/warranty';

export function buildCustomerReceiptSmsPreview({
  record,
  shop,
}: {
  record: HistoryRecord;
  shop: LoginShop | null;
}): string {
  const shopName = shop?.shopName?.trim() || 'Shop';
  const displayOrderId = formatDisplayOrderNumber(record.cartNumber, record.orderId);
  const hasDiscount = record.isDiscount && record.discountedAmount > 0;
  const lines = [
    `Thank you for shopping at ${shopName}!`,
    '',
    `Order: ${displayOrderId}`,
    `Subtotal: ${formatCheckoutAmount(record.amount)}`,
  ];

  if (hasDiscount) {
    lines.push(`Discount: -${formatCheckoutAmount(record.discountedAmount)}`);
    lines.push(`Total paid: ${formatCheckoutAmount(record.totalAmount)}`);
  } else if (record.totalAmount !== record.amount) {
    lines.push(`Total paid: ${formatCheckoutAmount(record.totalAmount)}`);
  }

  if (record.items.length) {
    lines.push('', 'Items:');
    for (const entry of record.items) {
      const warrantyLine = formatHistoryItemWarrantySms(entry);
      const productLine = `- ${entry.productName} x${entry.qty}`;
      lines.push(warrantyLine ? `${productLine} (${warrantyLine})` : productLine);
    }
  }

  lines.push('', 'View your digital receipt:', buildDigitalReceiptUrl(record._id), '', 'Thank you. Come again!');
  return lines.join('\n');
}

export function buildDigitalReceiptUrl(historyId: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}/receipt/${encodeURIComponent(historyId)}`;
}

export function buildReceiptShareMessage({
  record,
  shop,
}: {
  record: HistoryRecord;
  shop: LoginShop | null;
}): { title: string; message: string; url: string } {
  const shopName = shop?.shopName?.trim() || 'Shop';
  const shopAddress = shop?.address?.trim() || '—';
  const shopPhone = shop?.shopMobileNumber?.trim() || '';
  const ownerPhone = shop?.ownerMobileNumber?.trim() || '';
  const contactLine = [shopPhone, ownerPhone].filter(Boolean).join(' / ') || '—';
  const displayOrderId = formatDisplayOrderNumber(record.cartNumber, record.orderId);
  const customerName = record.customerName?.trim() || '—';
  const customerPhone = record.customerMobile?.trim() || '—';
  const normalizedStatus = normalizeHistoryStatus(record.status);
  const isCanceled = normalizedStatus === 'canceled';
  const isReversed = normalizedStatus === 'reversed';
  const isVoided = isCanceled || isReversed;
  const hasDiscount = record.isDiscount && record.discountedAmount > 0;
  const url = buildDigitalReceiptUrl(record._id);

  const lines: string[] = [
    shopName,
    shopAddress,
    contactLine,
    '',
    'SALES RECEIPT',
    `Order ${displayOrderId}`,
    '',
  ];

  if (isVoided) {
    lines.push(isCanceled ? '*** CANCELED ***' : '*** REVERSED ***');
    lines.push(isCanceled ? 'This sale has been canceled.' : 'This sale has been reversed.');
    lines.push('');
  }

  lines.push(
    `Date: ${formatCheckoutTime(record.checkOutTime)}`,
    `Payment: ${getPaymentLabel(record.paymentOption)}`,
    `Status: ${getHistoryStatusLabel(record.status)}`,
  );

  if (isVoided) {
    lines.push(
      `${isCanceled ? 'Canceled' : 'Reversed'} at: ${
        record.reversedAt ? formatCheckoutTime(record.reversedAt) : '—'
      }`,
      `${isCanceled ? 'Canceled' : 'Reversed'} by: ${record.reversedUserName?.trim() || '—'}`,
    );
  }

  lines.push(
    `Handled by: ${record.submittedUserName || '—'}`,
    `Customer: ${customerName}`,
    `Phone: ${customerPhone}`,
    '',
    'Items:',
  );

  for (const entry of record.items) {
    const lineTotal =
      entry.unitCost != null ? Number((entry.unitCost * entry.qty).toFixed(2)) : null;
    const unitPart =
      entry.unitCost != null ? ` @ ${formatCheckoutAmount(entry.unitCost)}` : '';
    const amountPart = lineTotal != null ? formatCheckoutAmount(lineTotal) : '—';
    const warrantyLine = formatHistoryItemWarranty(entry);
    lines.push(`- ${entry.productName}${unitPart} x${entry.qty} = ${amountPart}`);
    if (warrantyLine) {
      lines.push(`  ${warrantyLine}`);
    }
  }

  lines.push(
    '',
    `Subtotal: ${formatCheckoutAmount(record.amount)}`,
  );

  if (hasDiscount) {
    lines.push(`Discount: -${formatCheckoutAmount(record.discountedAmount)}`);
  }

  lines.push(`Total: ${formatCheckoutAmount(record.totalAmount)}`, '');

  if (isVoided) {
    lines.push(
      isCanceled
        ? 'This receipt is canceled and is no longer valid.'
        : 'This receipt is reversed and is no longer valid.',
    );
  } else {
    lines.push('Thank you for shopping with us. Come again!');
  }

  return {
    title: `Sales receipt - Order ${displayOrderId}`,
    message: lines.join('\n'),
    url,
  };
}
