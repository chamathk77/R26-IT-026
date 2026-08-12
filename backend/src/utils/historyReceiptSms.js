function formatMoneyLkr(value) {
  return Number(value ?? 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildDigitalReceiptUrl(historyId) {
  const base = process.env.DIGITAL_RECEIPT_BASE_URL?.trim().replace(/\/$/, '');
  if (!base || !historyId) {
    return null;
  }

  return `${base}/receipt/${encodeURIComponent(String(historyId))}`;
}

function formatWarrantyExpiryDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatHistoryItemWarrantySms(entry) {
  if (!entry?.warrantyMonths || !entry?.warrantyExpiresAt) {
    return null;
  }

  return `Warranty ${entry.warrantyMonths}mo until ${formatWarrantyExpiryDate(entry.warrantyExpiresAt)}`;
}

/**
 * SMS body sent to the customer after a successful checkout.
 *
 * Structure:
 * - Greeting with shop name
 * - Order ID + subtotal (and discount/total when applicable)
 * - Item lines with warranty when snapshotted on the sale
 * - Digital receipt link
 * - Closing thank-you line
 */
function buildHistoryReceiptSmsMessage({
  shopName,
  orderId,
  cartNumber,
  amount,
  totalAmount,
  isDiscount,
  discountedAmount,
  receiptUrl,
  items = [],
}) {
  const safeShopName = String(shopName ?? 'Our shop').trim() || 'Our shop';
  const safeOrderId =
    cartNumber != null && Number(cartNumber) > 0
      ? `#${cartNumber}`
      : String(orderId ?? '').trim() || '—';
  const lines = [
    `Thank you for shopping at ${safeShopName}!`,
    '',
    `Order: ${safeOrderId}`,
    `Subtotal: Rs.${formatMoneyLkr(amount)}`,
  ];

  if (isDiscount && Number(discountedAmount) > 0) {
    lines.push(`Discount: Rs.${formatMoneyLkr(discountedAmount)}`);
    lines.push(`Total paid: Rs.${formatMoneyLkr(totalAmount)}`);
  } else if (Number(totalAmount) !== Number(amount)) {
    lines.push(`Total paid: Rs.${formatMoneyLkr(totalAmount)}`);
  }

  if (Array.isArray(items) && items.length) {
    lines.push('', 'Items:');
    for (const entry of items) {
      const qty = Number(entry?.qty) > 0 ? Number(entry.qty) : 1;
      const warrantyLine = formatHistoryItemWarrantySms(entry);
      const productLine = `- ${entry.productName} x${qty}`;
      lines.push(warrantyLine ? `${productLine} (${warrantyLine})` : productLine);
    }
  }

  lines.push('');
  lines.push('View your digital receipt:');
  lines.push(receiptUrl);
  lines.push('');
  lines.push('Thank you. Come again!');

  return lines.join('\n');
}

module.exports = {
  formatMoneyLkr,
  buildDigitalReceiptUrl,
  buildHistoryReceiptSmsMessage,
};
