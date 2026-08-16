import type { LoginShop } from '../../type/auth';
import type { KitchenTicket } from '../../type/kitchen';
import { formatCheckoutTime } from '../../screens/pos/HistoryScreens/historyFormat';
import { getPrinterService } from './PrinterService';
import type { PrinterActionResult } from './printerTypes';

const LINE_WIDTH = 48;
const QTY_WIDTH = 5;
const ITEM_WIDTH = LINE_WIDTH - QTY_WIDTH;
const ESC = '\x1b';
const GS = '\x1d';
const ALIGN_LEFT = `${ESC}a\x00`;
const ALIGN_CENTER = `${ESC}a\x01`;
const BOLD_ON = `${ESC}E\x01`;
const BOLD_OFF = `${ESC}E\x00`;
const DOUBLE_ON = `${GS}!\x11`;
const DOUBLE_OFF = `${GS}!\x00`;

function toPrintable(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, '');
}

function wrap(value: string, width: number): string[] {
  const text = toPrintable(value).trim();
  if (!text) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width) {
      if (current) lines.push(current);
      if (word.length > width) {
        for (let i = 0; i < word.length; i += width) {
          lines.push(word.slice(i, i + width));
        }
        current = '';
      } else {
        current = word;
      }
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function divider(char = '-'): string {
  return char.repeat(LINE_WIDTH);
}

function resolveTableLabel(ticket: KitchenTicket): string | null {
  if (ticket.orderType !== 'dine_in') {
    return null;
  }

  const label = ticket.orderLabel?.trim();
  if (!label) {
    return null;
  }

  if (/^table\b/i.test(label)) {
    return label;
  }

  return `Table ${label}`;
}

function resolveOrderTypeLabel(ticket: KitchenTicket): string {
  switch (ticket.orderType) {
    case 'takeaway':
      return 'Takeaway';
    case 'delivery':
      return 'Delivery';
    case 'dine_in':
      return 'Dine-in';
    default:
      return 'Kitchen order';
  }
}

export function buildKitchenTicketBill(
  ticket: KitchenTicket,
  shop: LoginShop | null,
): string {
  const shopName = shop?.shopName?.trim() || 'Kitchen';
  const tableLabel = resolveTableLabel(ticket);
  const orderTypeLabel = resolveOrderTypeLabel(ticket);
  const createdAt = ticket.createdAt
    ? formatCheckoutTime(ticket.createdAt)
    : new Date().toLocaleString();
  const kotLabel = ticket.ticketNumber > 1 ? `KOT #${ticket.ticketNumber}` : 'NEW KOT';

  const lines: string[] = [
    ALIGN_CENTER,
    `${BOLD_ON}${toPrintable(shopName)}${BOLD_OFF}`,
    divider('='),
    `${DOUBLE_ON}${BOLD_ON}KITCHEN ORDER${BOLD_OFF}${DOUBLE_OFF}`,
    divider('='),
    ALIGN_LEFT,
    `${BOLD_ON}Order #${ticket.cartNumber}${BOLD_OFF}`,
  ];

  if (tableLabel) {
    lines.push(`${DOUBLE_ON}${BOLD_ON}${toPrintable(tableLabel)}${BOLD_OFF}${DOUBLE_OFF}`);
  } else if (ticket.orderLabel?.trim()) {
    lines.push(`${BOLD_ON}${toPrintable(ticket.orderLabel.trim())}${BOLD_OFF}`);
  } else {
    lines.push(`${BOLD_ON}${orderTypeLabel}${BOLD_OFF}`);
  }

  lines.push(
    `Ticket: ${kotLabel}`,
    `Time: ${toPrintable(createdAt)}`,
    divider(),
    `${BOLD_ON}${'ITEM'.padEnd(ITEM_WIDTH)}${'QTY'.padStart(QTY_WIDTH)}${BOLD_OFF}`,
  );

  if (!ticket.items.length) {
    lines.push('No items');
  }

  for (const item of ticket.items) {
    const nameLines = wrap(item.name, ITEM_WIDTH - 1);
    const [first, ...rest] = nameLines;
    lines.push(`${first.padEnd(ITEM_WIDTH)}${String(item.quantity).padStart(QTY_WIDTH)}`);
    for (const extra of rest) {
      lines.push(extra);
    }
  }

  lines.push(
    divider('='),
    ALIGN_CENTER,
    `${BOLD_ON}Prepare now${BOLD_OFF}`,
    ALIGN_LEFT,
  );

  return lines.join('\n');
}

export async function printKitchenTicket(params: {
  ticket: KitchenTicket;
  shop: LoginShop | null;
}): Promise<PrinterActionResult> {
  const content = buildKitchenTicketBill(params.ticket, params.shop);
  return getPrinterService('kitchen').printReceipt(content);
}

export async function printKitchenTicketIfConfigured(params: {
  ticket: KitchenTicket;
  shop: LoginShop | null;
}): Promise<void> {
  try {
    const result = await printKitchenTicket(params);
    if (!result.success && __DEV__) {
      console.warn('[Kitchen print]', result.message);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[Kitchen print]', error);
    }
  }
}
