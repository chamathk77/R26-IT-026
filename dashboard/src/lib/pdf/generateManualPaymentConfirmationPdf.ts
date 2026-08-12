import { jsPDF } from 'jspdf';
import type { ManualPaymentConfirmation } from '@/lib/api/payments.types';
import {
  BUSINESS_SUPPORT_EMAIL,
  BUSINESS_SUPPORT_PHONE_DISPLAY,
} from '@/lib/businessConfig';
import { formatDate, formatDateTime } from '@/lib/utils/formatDate';

const PAGE_WIDTH = 210;
const MARGIN_X = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function formatAmount(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(21, 101, 192);
  doc.text(title, MARGIN_X, y);
  doc.setDrawColor(21, 101, 192);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_X, y + 2, PAGE_WIDTH - MARGIN_X, y + 2);
  return y + 10;
}

function drawLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  valueOffset = 42,
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(label, MARGIN_X, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  const lines = doc.splitTextToSize(value, CONTENT_WIDTH - valueOffset);
  doc.text(lines, MARGIN_X + valueOffset, y);
  return y + Math.max(6, lines.length * 5.5);
}

export function generateManualPaymentConfirmationPdf(
  confirmation: ManualPaymentConfirmation,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 0;

  doc.setFillColor(21, 101, 192);
  doc.rect(0, 0, PAGE_WIDTH, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Smart Cost', MARGIN_X, 14);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Confirmation Receipt', MARGIN_X, 22);
  doc.setFontSize(9);
  doc.text('Manual upfront payment received', MARGIN_X, 28);

  y = 44;
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Receipt: ${confirmation.receiptNumber}`, MARGIN_X, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Generated: ${formatDateTime(confirmation.createdAt)}`, MARGIN_X, y);
  y += 12;

  y = drawSectionTitle(doc, 'Product / Service', y);
  y = drawLabelValue(doc, 'Product:', confirmation.productName, y);
  y += 4;

  y = drawSectionTitle(doc, 'Purchaser / Shop Details', y);
  y = drawLabelValue(doc, 'Shop name:', confirmation.shopName, y);
  y = drawLabelValue(doc, 'Address:', confirmation.address, y);
  y = drawLabelValue(doc, 'Phone:', confirmation.shopMobileNumber, y);
  y += 4;

  y = drawSectionTitle(doc, 'Payment Details', y);

  doc.setFillColor(245, 248, 252);
  doc.roundedRect(MARGIN_X, y - 2, CONTENT_WIDTH, 28, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text('Amount received', MARGIN_X + 6, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(21, 101, 192);
  doc.text(formatAmount(confirmation.paymentAmount), MARGIN_X + 6, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(`Payment date: ${formatDate(confirmation.paymentReceivedDate)}`, MARGIN_X + 6, y + 23);
  doc.text(`Payment method: ${confirmation.paymentMethod}`, MARGIN_X + 95, y + 23);

  y += 34;

  if (confirmation.description) {
    y = drawSectionTitle(doc, 'Description', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    const descLines = doc.splitTextToSize(confirmation.description, CONTENT_WIDTH);
    doc.text(descLines, MARGIN_X, y);
    y += descLines.length * 5.5 + 4;
  }

  if (confirmation.notes) {
    y = drawSectionTitle(doc, 'Internal Notes', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    const noteLines = doc.splitTextToSize(confirmation.notes, CONTENT_WIDTH);
    doc.text(noteLines, MARGIN_X, y);
    y += noteLines.length * 5.5 + 4;
  }

  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  const footer =
    'This document confirms that Smart Cost has received the upfront payment listed above from the customer. Please retain this receipt for your records.';
  const footerLines = doc.splitTextToSize(footer, CONTENT_WIDTH);
  doc.text(footerLines, MARGIN_X, y);
  y += footerLines.length * 5 + 6;

  if (confirmation.generatedByName) {
    doc.text(`Issued by: ${confirmation.generatedByName}`, MARGIN_X, y);
    y += 6;
  }

  doc.text(
    `Support: ${BUSINESS_SUPPORT_PHONE_DISPLAY} · ${BUSINESS_SUPPORT_EMAIL}`,
    MARGIN_X,
    y,
  );

  const filename = `${confirmation.receiptNumber}-${confirmation.shopName.replace(/[^\w\-]+/g, '_')}.pdf`;
  doc.save(filename);
}
