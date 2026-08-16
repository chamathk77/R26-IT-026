import type { LoginShop } from '../type/auth';
import { formatCheckoutAmount } from '../type/checkoutPayment';
import type { QuotationRecord } from '../type/quotation';

import { formatQuotationDate, formatQuotationDiscountLabel } from './quotationPresentation';

export function buildQuotationShareMessage({
  record,
  shop,
}: {
  record: QuotationRecord;
  shop: LoginShop | null;
}): { title: string; message: string } {
  const shopName = shop?.shopName?.trim() || 'Shop';
  const shopAddress = shop?.address?.trim() || '';
  const shopPhone = shop?.shopMobileNumber?.trim() || '';
  const ownerPhone = shop?.ownerMobileNumber?.trim() || '';
  const contactLine = [shopPhone, ownerPhone].filter(Boolean).join(' / ');
  const customerName = record.customerName?.trim() || 'Walk-in customer';
  const customerPhone = record.customerMobile?.trim() || '';

  const lines: string[] = [
    shopName,
    ...(shopAddress ? [shopAddress] : []),
    ...(contactLine ? [contactLine] : []),
    '',
    'QUOTATION',
    record.quotationNumber,
    `Date: ${formatQuotationDate(record.createdAt)}`,
    `Status: ${record.status}`,
    '',
    'Customer',
    customerName,
  ];

  if (customerPhone) {
    lines.push(customerPhone);
  }

  lines.push('', 'Items');
  for (const item of record.items) {
    const lineTotal = (item.unitCost ?? 0) * item.qty;
    lines.push(
      `- ${item.productName}`,
      `  ${item.qty} x ${formatCheckoutAmount(item.unitCost ?? 0)} = ${formatCheckoutAmount(lineTotal)}`,
    );
  }

  lines.push('', `Subtotal: ${formatCheckoutAmount(record.subtotal)}`);

  if ((record.discountAmount ?? 0) > 0) {
    lines.push(
      `${formatQuotationDiscountLabel(record)}: -${formatCheckoutAmount(record.discountAmount ?? 0)}`,
    );
  }

  if (record.includeTaxes && record.taxBreakdown.length > 0) {
    for (const entry of record.taxBreakdown) {
      lines.push(`${entry.label}: ${formatCheckoutAmount(entry.amount)}`);
    }
  } else if (record.includeTaxes && record.taxAmount > 0) {
    lines.push(`Taxes: ${formatCheckoutAmount(record.taxAmount)}`);
  }

  lines.push(`Total: ${formatCheckoutAmount(record.totalAmount)}`);

  if (record.notes?.trim()) {
    lines.push('', 'Notes', record.notes.trim());
  }

  lines.push('', 'This is a price quotation, not a tax invoice.');

  return {
    title: `Quotation ${record.quotationNumber}`,
    message: lines.join('\n'),
  };
}
