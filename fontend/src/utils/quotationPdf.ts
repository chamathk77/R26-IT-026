import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { LoginShop } from '../type/auth';
import { formatCheckoutAmount } from '../type/checkoutPayment';
import type { QuotationRecord } from '../type/quotation';
import {
  formatQuotationDate,
  formatQuotationDiscountLabel,
  getQuotationStatusStyle,
  QUOTATION_BRAND,
} from './quotationPresentation';
import { buildQuotationShareMessage } from './quotationShare';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildQuotationPdfHtml({
  record,
  shop,
}: {
  record: QuotationRecord;
  shop: LoginShop | null;
}): string {
  const shopName = escapeHtml(shop?.shopName?.trim() || 'Shop');
  const shopAddress = escapeHtml(shop?.address?.trim() || '—');
  const shopPhone = shop?.shopMobileNumber?.trim() || '';
  const ownerPhone = shop?.ownerMobileNumber?.trim() || '';
  const contactLine = escapeHtml([shopPhone, ownerPhone].filter(Boolean).join(' · ') || '—');
  const customerName = escapeHtml(record.customerName?.trim() || 'Walk-in customer');
  const customerPhone = escapeHtml(record.customerMobile?.trim() || '');
  const quoteNumber = escapeHtml(record.quotationNumber);
  const status = escapeHtml(record.status);
  const dateText = escapeHtml(formatQuotationDate(record.createdAt));
  const notes = record.notes?.trim() ? escapeHtml(record.notes.trim()) : '';
  const statusStyle = getQuotationStatusStyle(record.status);

  const itemRows = record.items
    .map((item, index) => {
      const lineTotal = (item.unitCost ?? 0) * item.qty;
      return `
        <div class="item-card">
          <div class="item-index">${index + 1}</div>
          <div class="item-content">
            <div class="item-name">${escapeHtml(item.productName)}</div>
            <div class="item-unit">${item.qty} × ${escapeHtml(formatCheckoutAmount(item.unitCost ?? 0))}</div>
          </div>
          <div class="item-amount">${escapeHtml(formatCheckoutAmount(lineTotal))}</div>
        </div>
      `;
    })
    .join('');

  const taxRows =
    record.includeTaxes && record.taxBreakdown.length > 0
      ? record.taxBreakdown
          .map(
            (entry) => `
              <div class="summary-row">
                <span>${escapeHtml(entry.label)}</span>
                <span>${escapeHtml(formatCheckoutAmount(entry.amount))}</span>
              </div>
            `,
          )
          .join('')
      : record.includeTaxes && record.taxAmount > 0
        ? `
          <div class="summary-row">
            <span>Taxes</span>
            <span>${escapeHtml(formatCheckoutAmount(record.taxAmount))}</span>
          </div>
        `
        : '';

  const discountRow =
    (record.discountAmount ?? 0) > 0
      ? `
          <div class="summary-row discount-row">
            <span>${escapeHtml(formatQuotationDiscountLabel(record))}</span>
            <span>-${escapeHtml(formatCheckoutAmount(record.discountAmount ?? 0))}</span>
          </div>
        `
      : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: ${QUOTATION_BRAND.ink};
            margin: 0;
            padding: 24px;
            background: #eef2f7;
          }
          .page {
            max-width: 760px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid ${QUOTATION_BRAND.border};
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
          }
          .hero {
            background: linear-gradient(135deg, ${QUOTATION_BRAND.primary} 0%, ${QUOTATION_BRAND.primaryDark} 100%);
            color: #ffffff;
            padding: 28px 28px 24px;
            position: relative;
            overflow: hidden;
          }
          .hero:before,
          .hero:after {
            content: '';
            position: absolute;
            border-radius: 999px;
            background: rgba(255,255,255,0.12);
          }
          .hero:before {
            width: 140px;
            height: 140px;
            top: -40px;
            right: -30px;
          }
          .hero:after {
            width: 90px;
            height: 90px;
            bottom: -20px;
            left: -20px;
            background: rgba(255,255,255,0.08);
          }
          .hero-inner { position: relative; z-index: 1; }
          .shop-row {
            display: flex;
            gap: 14px;
            align-items: flex-start;
            margin-bottom: 22px;
          }
          .shop-badge {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            background: #ffffff;
            color: ${QUOTATION_BRAND.primary};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 700;
          }
          .shop-name {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 4px;
          }
          .shop-meta {
            font-size: 12px;
            line-height: 1.5;
            color: rgba(255,255,255,0.86);
            margin: 0;
          }
          .doc-eyebrow {
            font-size: 11px;
            letter-spacing: 1.6px;
            font-weight: 700;
            color: rgba(255,255,255,0.82);
            margin-bottom: 6px;
          }
          .title-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }
          .quote-number {
            font-size: 30px;
            font-weight: 700;
            margin: 0;
          }
          .status {
            display: inline-block;
            padding: 7px 12px;
            border-radius: 999px;
            background: ${statusStyle.pdfBg};
            color: ${statusStyle.text};
            font-size: 11px;
            font-weight: 700;
            text-transform: capitalize;
          }
          .date {
            margin-top: 8px;
            font-size: 12px;
            color: rgba(255,255,255,0.82);
          }
          .body {
            padding: 24px 28px 28px;
          }
          .info-card,
          .notes-card {
            background: ${QUOTATION_BRAND.surface};
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 18px;
          }
          .section-label {
            font-size: 11px;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: ${QUOTATION_BRAND.muted};
            font-weight: 600;
            margin-bottom: 6px;
          }
          .customer-name {
            font-size: 18px;
            font-weight: 700;
            margin: 0;
          }
          .customer-phone {
            font-size: 13px;
            color: ${QUOTATION_BRAND.muted};
            margin-top: 6px;
          }
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
          }
          .section-meta {
            font-size: 12px;
            color: ${QUOTATION_BRAND.muted};
          }
          .item-card {
            display: flex;
            align-items: center;
            gap: 12px;
            border: 1px solid ${QUOTATION_BRAND.border};
            border-radius: 14px;
            padding: 12px 14px;
            margin-bottom: 10px;
            background: #ffffff;
          }
          .item-index {
            width: 28px;
            height: 28px;
            border-radius: 9px;
            background: ${QUOTATION_BRAND.primaryLight};
            color: ${QUOTATION_BRAND.primary};
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .item-content { flex: 1; }
          .item-name {
            font-size: 14px;
            font-weight: 700;
            line-height: 1.4;
          }
          .item-unit {
            font-size: 12px;
            color: ${QUOTATION_BRAND.muted};
            margin-top: 2px;
          }
          .item-amount {
            font-size: 14px;
            font-weight: 700;
            white-space: nowrap;
          }
          .summary-card {
            border: 1px solid ${QUOTATION_BRAND.border};
            border-radius: 16px;
            padding: 16px;
            margin-top: 8px;
            margin-bottom: 14px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
            color: #475569;
          }
          .summary-row:last-child { margin-bottom: 0; }
          .discount-row span:last-child {
            color: #dc2626;
            font-weight: 600;
          }
          .total-box {
            background: ${QUOTATION_BRAND.primaryLight};
            border-radius: 18px;
            padding: 18px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
          }
          .total-label {
            font-size: 15px;
            font-weight: 700;
            color: ${QUOTATION_BRAND.primaryDark};
          }
          .total-hint {
            font-size: 12px;
            color: ${QUOTATION_BRAND.primaryDark};
            opacity: 0.75;
            margin-top: 4px;
          }
          .total-value {
            font-size: 28px;
            font-weight: 700;
            color: ${QUOTATION_BRAND.primary};
            white-space: nowrap;
          }
          .notes {
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
          }
          .footer-note {
            margin-top: 18px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="hero">
            <div class="hero-inner">
              <div class="shop-row">
                <div class="shop-badge">S</div>
                <div>
                  <h1 class="shop-name">${shopName}</h1>
                  <p class="shop-meta">${shopAddress}</p>
                  <p class="shop-meta">${contactLine}</p>
                </div>
              </div>

              <div class="doc-eyebrow">QUOTATION</div>
              <div class="title-row">
                <h2 class="quote-number">${quoteNumber}</h2>
                <span class="status">${status}</span>
              </div>
              <div class="date">${dateText}</div>
            </div>
          </div>

          <div class="body">
            <div class="info-card">
              <div class="section-label">Prepared for</div>
              <p class="customer-name">${customerName}</p>
              ${customerPhone ? `<div class="customer-phone">${customerPhone}</div>` : ''}
            </div>

            <div class="section-header">
              <div class="section-title">Line items</div>
              <div class="section-meta">${record.items.length} item${record.items.length === 1 ? '' : 's'}</div>
            </div>

            ${itemRows}

            <div class="summary-card">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>${escapeHtml(formatCheckoutAmount(record.subtotal))}</span>
              </div>
              ${discountRow}
              ${taxRows}
            </div>

            <div class="total-box">
              <div>
                <div class="total-label">Quote total</div>
                <div class="total-hint">${record.includeTaxes ? 'Taxes included' : 'Taxes not included'}</div>
              </div>
              <div class="total-value">${escapeHtml(formatCheckoutAmount(record.totalAmount))}</div>
            </div>

            ${
              notes
                ? `
              <div class="notes-card">
                <div class="section-label">Notes</div>
                <div class="notes">${notes}</div>
              </div>
            `
                : ''
            }

            <div class="footer-note">
              This document is a quotation for pricing purposes only. It is not a tax invoice.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function generateQuotationPdfUri({
  record,
  shop,
}: {
  record: QuotationRecord;
  shop: LoginShop | null;
}): Promise<string> {
  const html = buildQuotationPdfHtml({ record, shop });
  const result = await Print.printToFileAsync({
    html,
    base64: false,
  });
  return result.uri;
}

export async function shareQuotationPdf({
  record,
  shop,
}: {
  record: QuotationRecord;
  shop: LoginShop | null;
}): Promise<void> {
  const pdfUri = await generateQuotationPdfUri({ record, shop });
  const { title } = buildQuotationShareMessage({ record, shop });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: title,
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  throw new Error('Sharing is not available on this device');
}
