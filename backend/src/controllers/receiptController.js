const mongoose = require('mongoose');
const History = require('../models/history');
const ShopsData = require('../models/shopsData');

const PAYMENT_LABELS = {
  cash: 'Cash',
  card: 'Card',
  online: 'Online payment',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCheckoutAmount(amount) {
  return `Rs. ${Number(amount ?? 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCheckoutTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function normalizeHistoryStatus(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'reversed' || normalized === 'canceled') return normalized;
  return 'submited';
}

function getPaymentLabel(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return PAYMENT_LABELS[normalized] ?? (normalized || '—');
}

function getHistoryStatusLabel(value) {
  const normalized = normalizeHistoryStatus(value);
  if (normalized === 'reversed') return 'Reversed';
  if (normalized === 'canceled') return 'Canceled';
  return 'Submitted';
}

function buildVoidStatusBanner(status) {
  if (status === 'canceled') {
    return `<div class="status-banner status-canceled">
      <strong>CANCELED</strong>
      <span>This sale has been canceled.</span>
    </div>`;
  }
  if (status === 'reversed') {
    return `<div class="status-banner status-reversed">
      <strong>REVERSED</strong>
      <span>This sale has been reversed.</span>
    </div>`;
  }
  return '';
}

function receiptRow(label, value, bold = false) {
  const valueClass = bold ? 'receipt-value receipt-bold' : 'receipt-value';
  return `<div class="receipt-row">
    <span class="receipt-label">${escapeHtml(label)}</span>
    <span class="${valueClass}">${escapeHtml(value)}</span>
  </div>`;
}

function buildReceiptHtml({ shop, history }) {
  const shopName = shop?.shopName?.trim() || 'Shop';
  const shopAddress = shop?.address?.trim() || '—';
  const shopPhone = shop?.shopMobileNumber?.trim() || '';
  const ownerPhone = shop?.ownerMobileNumber?.trim() || '';
  const contactLine = [shopPhone, ownerPhone].filter(Boolean).join(' / ') || '—';
  const displayOrderId = history.orderId?.trim() || '—';
  const customerName = history.customerName?.trim() || '—';
  const customerPhone = history.customerMobile?.trim() || '—';
  const hasDiscount = Boolean(history.isDiscount) && Number(history.discountedAmount) > 0;
  const normalizedStatus = normalizeHistoryStatus(history.status);
  const isCanceled = normalizedStatus === 'canceled';
  const isReversed = normalizedStatus === 'reversed';
  const isVoided = isCanceled || isReversed;
  const statusBanner = buildVoidStatusBanner(normalizedStatus);
  const voidedDetailRows = isVoided
    ? `${receiptRow(isCanceled ? 'Canceled at' : 'Reversed at', formatCheckoutTime(history.reversedAt))}
        ${receiptRow(isCanceled ? 'Canceled by' : 'Reversed by', history.reversedUserName?.trim() || '—')}`
    : '';
  const thankYouMessage = isCanceled
    ? 'This receipt is canceled and is no longer valid.'
    : isReversed
      ? 'This receipt is reversed and is no longer valid.'
      : 'Thank you for shopping with us. Come again!';

  const itemRows = (history.items ?? [])
    .map((entry) => {
      const lineTotal =
        entry.unitCost != null
          ? Number((entry.unitCost * entry.qty).toFixed(2))
          : null;
      const unitLine =
        entry.unitCost != null
          ? `<div class="item-unit">@ ${escapeHtml(formatCheckoutAmount(entry.unitCost))}</div>`
          : '';

      return `<div class="item-row">
        <div class="item-name-col">
          <div class="item-name">${escapeHtml(entry.productName)}</div>
          ${unitLine}
        </div>
        <div class="item-qty">${escapeHtml(entry.qty)}</div>
        <div class="item-amount">${lineTotal != null ? escapeHtml(formatCheckoutAmount(lineTotal)) : '—'}</div>
      </div>`;
    })
    .join('');

  const discountRow = hasDiscount
    ? receiptRow('Discount', `-${formatCheckoutAmount(history.discountedAmount)}`)
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sales receipt ${escapeHtml(displayOrderId)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 16px;
    }
    .page {
      max-width: 420px;
      margin: 0 auto;
      background: #f8fafc;
      border-radius: 18px;
      overflow: hidden;
    }
    .page-header {
      padding: 14px 16px;
      border-bottom: 1px solid #cbd5e1;
      background: #fff;
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
    }
    .receipt-scroll {
      padding: 16px;
    }
    .receipt-paper {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 16px;
    }
    .receipt-paper-voided {
      border-color: #fecaca;
    }
    .status-banner {
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 12px;
      text-align: center;
    }
    .status-banner strong {
      display: block;
      font-size: 13px;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .status-banner span {
      display: block;
      font-size: 12px;
    }
    .status-reversed {
      background: #fff7ed;
      border: 1px solid #fdba74;
      color: #9a3412;
    }
    .status-canceled {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      color: #b91c1c;
    }
    .status-value-reversed { color: #c2410c; font-weight: 700; }
    .status-value-canceled { color: #dc2626; font-weight: 700; }
    .shop-name {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      margin: 0;
    }
    .shop-meta {
      font-size: 12px;
      color: #475569;
      text-align: center;
      margin: 4px 0 0;
    }
    .divider {
      border-bottom: 1px dashed #cbd5e1;
      margin: 12px 0;
    }
    .receipt-heading {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      letter-spacing: 1.2px;
      margin: 2px 0 0;
    }
    .receipt-subheading {
      font-size: 12px;
      font-weight: 500;
      color: #334155;
      text-align: center;
      margin: 2px 0 0;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }
    .receipt-label {
      flex: 1;
      font-size: 12px;
      color: #64748b;
    }
    .receipt-value {
      flex: 1.2;
      font-size: 12px;
      font-weight: 500;
      color: #0f172a;
      text-align: right;
    }
    .receipt-bold {
      font-size: 13px;
      font-weight: 700;
    }
    .items-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      gap: 8px;
    }
    .items-header-text {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .item-name-col { flex: 1; min-width: 0; }
    .item-qty-col { width: 34px; text-align: center; }
    .item-amount-col { width: 72px; text-align: right; }
    .item-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 10px;
    }
    .item-name {
      font-size: 12px;
      font-weight: 500;
      color: #0f172a;
    }
    .item-unit {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .item-qty {
      width: 34px;
      text-align: center;
      font-size: 12px;
      font-weight: 500;
      color: #0f172a;
    }
    .item-amount {
      width: 72px;
      text-align: right;
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
    }
    .thank-you {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      text-align: center;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="page-header">Sales receipt</div>
    <div class="receipt-scroll">
      <div class="receipt-paper ${isVoided ? 'receipt-paper-voided' : ''}">
        ${statusBanner}
        <p class="shop-name">${escapeHtml(shopName)}</p>
        <p class="shop-meta">${escapeHtml(shopAddress)}</p>
        <p class="shop-meta">${escapeHtml(contactLine)}</p>

        <div class="divider"></div>

        <p class="receipt-heading">SALES RECEIPT</p>
        <p class="receipt-subheading">Order ${escapeHtml(displayOrderId)}</p>

        <div class="divider"></div>

        ${receiptRow('Date', formatCheckoutTime(history.checkOutTime))}
        ${receiptRow('Payment', getPaymentLabel(history.paymentOption))}
        <div class="receipt-row">
          <span class="receipt-label">Status</span>
          <span class="receipt-value ${isCanceled ? 'status-value-canceled' : isReversed ? 'status-value-reversed' : ''}">${escapeHtml(getHistoryStatusLabel(history.status))}</span>
        </div>
        ${voidedDetailRows}
        ${receiptRow('Handled by', history.submittedUserName?.trim() || '—')}
        ${receiptRow('Customer name', customerName)}
        ${receiptRow('Customer phone', customerPhone)}

        <div class="divider"></div>

        <div class="items-header">
          <span class="items-header-text item-name-col">Item</span>
          <span class="items-header-text item-qty-col">Qty</span>
          <span class="items-header-text item-amount-col">Amount</span>
        </div>

        ${itemRows || '<div class="shop-meta">No items</div>'}

        <div class="divider"></div>

        ${receiptRow('Subtotal', formatCheckoutAmount(history.amount))}
        ${discountRow}
        ${receiptRow('Total', formatCheckoutAmount(history.totalAmount), true)}

        <div class="divider"></div>

        <p class="thank-you">${escapeHtml(thankYouMessage)}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const getDigitalReceipt = async (req, res) => {
  try {
    const { historyId } = req.params;

    if (!historyId || !mongoose.Types.ObjectId.isValid(historyId)) {
      return res.status(400).json({ success: false, message: 'Invalid receipt id' });
    }

    const history = await History.findById(historyId).lean();
    if (!history) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const shop = await ShopsData.findOne({ shopId: history.shopId })
      .select('shopName address shopMobileNumber ownerMobileNumber')
      .lean();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(buildReceiptHtml({ shop, history }));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDigitalReceipt,
};
