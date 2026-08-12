import type { LoginShop } from '../../type/auth';
import type { HistoryRecord } from '../../type/history';
import { formatCheckoutAmount } from '../../type/checkoutPayment';
import {
  formatCheckoutTime,
  getHistoryStatusLabel,
  getPaymentLabel,
  normalizeHistoryStatus,
} from '../../screens/pos/HistoryScreens/historyFormat';
import { formatDisplayOrderNumber } from '../../utils/orderNumber';
import { formatHistoryItemWarranty } from '../../utils/warranty';
import { getPrinterService } from './PrinterService';
import type { PrinterActionResult } from './printerTypes';

/** Font A on an 80mm head prints 48 characters per line. */
const LINE_WIDTH = 48;
const QTY_WIDTH = 4;
const AMOUNT_WIDTH = 14;
const NAME_WIDTH = LINE_WIDTH - QTY_WIDTH - AMOUNT_WIDTH;

const ESC = '\x1b';
const GS = '\x1d';
const ALIGN_LEFT = `${ESC}a\x00`;
const ALIGN_CENTER = `${ESC}a\x01`;
const BOLD_ON = `${ESC}E\x01`;
const BOLD_OFF = `${ESC}E\x00`;
const DOUBLE_ON = `${GS}!\x11`;
const DOUBLE_OFF = `${GS}!\x00`;

const UNICODE_FALLBACKS: Record<string, string> = {
  '\u2014': '-',
  '\u2013': '-',
  '\u00b7': '-',
  '\u2018': "'",
  '\u2019': "'",
  '\u201c': '"',
  '\u201d': '"',
  '\u2022': '*',
  '\u20a8': 'Rs.',
  '\u2026': '...',
};

/** ESC/POS code pages are single byte, so anything wider is transliterated. */
function toPrintable(value: string): string {
  return value
    .replace(
      /[\u2014\u2013\u00b7\u2018\u2019\u201c\u201d\u2022\u20a8\u2026]/g,
      (char) => UNICODE_FALLBACKS[char],
    )
    .replace(/[^\x20-\x7e]/g, '');
}

function wrap(value: string, width: number): string[] {
  const text = toPrintable(value).trim();
  if (!text) {
    return [''];
  }

  const lines: string[] = [];
  let current = '';

  for (const word of text.split(/\s+/)) {
    if (word.length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += width) {
        lines.push(word.slice(i, i + width));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [''];
}

/** Label on the left, value flushed right, wrapping the value when needed. */
function row(label: string, value: string, width = LINE_WIDTH): string {
  const left = toPrintable(label);
  const valueLines = wrap(value, Math.max(width - left.length - 1, 8));
  const [first, ...rest] = valueLines;

  const lines = [`${left}${first.padStart(width - left.length)}`];
  for (const line of rest) {
    lines.push(line.padStart(width));
  }
  return lines.join('\n');
}

function divider(char = '-'): string {
  return char.repeat(LINE_WIDTH);
}

function itemLine(name: string, qty: string, amount: string): string {
  const nameLines = wrap(name, NAME_WIDTH - 1);
  const [first, ...rest] = nameLines;

  const lines = [
    first.padEnd(NAME_WIDTH) + qty.padStart(QTY_WIDTH) + amount.padStart(AMOUNT_WIDTH),
  ];
  for (const line of rest) {
    lines.push(line);
  }
  return lines.join('\n');
}

export function buildThermalReceiptBill(
  record: HistoryRecord,
  shop: LoginShop | null,
): string {
  const shopName = shop?.shopName?.trim() || 'Shop';
  const shopAddress = shop?.address?.trim() || '';
  const shopPhone = shop?.shopMobileNumber?.trim() || '';
  const ownerPhone = shop?.ownerMobileNumber?.trim() || '';
  const contactLine = [shopPhone, ownerPhone].filter(Boolean).join(' / ');
  const displayOrderId = formatDisplayOrderNumber(record.cartNumber, record.orderId);
  const customerName = record.customerName?.trim() || '-';
  const customerPhone = record.customerMobile?.trim() || '-';
  const hasDiscount = record.isDiscount && record.discountedAmount > 0;
  const normalizedStatus = normalizeHistoryStatus(record.status);
  const isCanceled = normalizedStatus === 'canceled';
  const isReversed = normalizedStatus === 'reversed';
  const isVoided = isCanceled || isReversed;

  const lines: string[] = [
    ALIGN_CENTER,
    `${DOUBLE_ON}${BOLD_ON}${toPrintable(shopName)}${BOLD_OFF}${DOUBLE_OFF}`,
  ];

  if (shopAddress) {
    lines.push(...wrap(shopAddress, LINE_WIDTH));
  }
  if (contactLine) {
    lines.push(toPrintable(contactLine));
  }

  lines.push(
    divider(),
    `${BOLD_ON}SALES RECEIPT${BOLD_OFF}`,
    `Order ${toPrintable(displayOrderId)}`,
    divider(),
  );

  if (isVoided) {
    lines.push(
      `${BOLD_ON}*** ${isCanceled ? 'CANCELED' : 'REVERSED'} ***${BOLD_OFF}`,
      isCanceled ? 'This sale has been canceled.' : 'This sale has been reversed.',
      divider(),
    );
  }

  lines.push(
    ALIGN_LEFT,
    row('Date', formatCheckoutTime(record.checkOutTime)),
    row('Payment', getPaymentLabel(record.paymentOption)),
    row('Status', getHistoryStatusLabel(record.status)),
  );

  if (isVoided) {
    lines.push(
      row(
        isCanceled ? 'Canceled at' : 'Reversed at',
        record.reversedAt ? formatCheckoutTime(record.reversedAt) : '-',
      ),
      row(
        isCanceled ? 'Canceled by' : 'Reversed by',
        record.reversedUserName?.trim() || '-',
      ),
    );
  }

  lines.push(
    row('Handled by', record.submittedUserName || '-'),
    row('Customer name', customerName),
    row('Customer phone', customerPhone),
    divider(),
    `${BOLD_ON}${'ITEM'.padEnd(NAME_WIDTH)}${'QTY'.padStart(QTY_WIDTH)}${'AMOUNT'.padStart(AMOUNT_WIDTH)}${BOLD_OFF}`,
  );

  for (const entry of record.items) {
    const lineTotal =
      entry.unitCost != null ? Number((entry.unitCost * entry.qty).toFixed(2)) : null;

    lines.push(
      itemLine(
        entry.productName,
        String(entry.qty),
        lineTotal != null ? formatCheckoutAmount(lineTotal) : '-',
      ),
    );

    if (entry.unitCost != null) {
      lines.push(`  @ ${toPrintable(formatCheckoutAmount(entry.unitCost))}`);
    }

    const warranty = formatHistoryItemWarranty(entry);
    if (warranty) {
      for (const warrantyLine of wrap(warranty, LINE_WIDTH - 2)) {
        lines.push(`  ${warrantyLine}`);
      }
    }
  }

  lines.push(divider(), row('Subtotal', formatCheckoutAmount(record.amount)));

  if (hasDiscount) {
    lines.push(row('Discount', `-${formatCheckoutAmount(record.discountedAmount)}`));
  }

  // Double-width doubles the glyph size, so this row is laid out at half width.
  lines.push(
    `${DOUBLE_ON}${BOLD_ON}${row('TOTAL', formatCheckoutAmount(record.totalAmount), LINE_WIDTH / 2)}${BOLD_OFF}${DOUBLE_OFF}`,
    divider(),
    ALIGN_CENTER,
  );

  const closing = isCanceled
    ? 'This receipt is canceled and is no longer valid.'
    : isReversed
      ? 'This receipt is reversed and is no longer valid.'
      : 'Thank you for shopping with us. Come again!';

  lines.push(...wrap(closing, LINE_WIDTH), ALIGN_LEFT);

  return lines.join('\n');
}

export async function printCheckoutReceipt(params: {
  record: HistoryRecord;
  shop: LoginShop | null;
}): Promise<PrinterActionResult> {
  const content = buildThermalReceiptBill(params.record, params.shop);
  return getPrinterService('receipt').printReceipt(content);
}

export async function printCheckoutReceiptIfConfigured(params: {
  record: HistoryRecord;
  shop: LoginShop | null;
}): Promise<void> {
  try {
    const result = await printCheckoutReceipt(params);
    if (!result.success && __DEV__) {
      console.warn('[Receipt print]', result.message);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[Receipt print]', error);
    }
  }
}
