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

/**
 * SMS body sent to the customer after a successful checkout.
 *
 * Structure:
 * - Greeting with shop name
 * - Order ID + subtotal (and discount/total when applicable)
 * - Digital receipt link
 * - Closing thank-you line
 */
function buildHistoryReceiptSmsMessage({
  shopName,
  orderId,
  amount,
  totalAmount,
  isDiscount,
  discountedAmount,
  receiptUrl,
}) {
  const safeShopName = String(shopName ?? 'Our shop').trim() || 'Our shop';
  const safeOrderId = String(orderId ?? '').trim() || '—';
  const lines = [
    `Thank you for shopping at ${safeShopName}!`,
    '',
    `Order: ${safeOrderId}`,
    `Subtotal: Rs.${formatMoneyLkr(amount)}`,
  ];

  if (isDiscount && Number(discountedAmount) > 0) {
    lines.push(`Discount: Rs.${formatMoneyLkr(discountedAmount)}`);
    lines.push(`Total paid: Rs.${formatMoneyLkr(totalAmount)}`);
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
