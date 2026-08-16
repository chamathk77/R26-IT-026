import type {
  BillTotalsPreview,
  ShopBillingConfig,
  ShopTaxConfig,
} from '../type/billing';

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}

export function createEmptyBillingConfig(): ShopBillingConfig {
  return { taxes: [] };
}

export function normalizeBillingConfig(
  billingConfig: ShopBillingConfig | null | undefined,
): ShopBillingConfig {
  if (!billingConfig) {
    return createEmptyBillingConfig();
  }

  return {
    taxes: Array.isArray(billingConfig.taxes)
      ? billingConfig.taxes.map((entry, index) => ({
          id: entry.id?.trim() || `tax-${index + 1}`,
          label: entry.label?.trim() || `Charge ${index + 1}`,
          rate: roundMoney(Number(entry.rate) || 0),
          enabled: Boolean(entry.enabled),
        }))
      : [],
  };
}

function calculateDiscountAmount(
  subtotal: number,
  discount?: { enabled?: boolean; type?: 'amount' | 'percent'; value?: number },
): number {
  if (!discount?.enabled) return 0;

  const discountValue = Number(discount.value);
  if (!Number.isFinite(discountValue) || discountValue <= 0) return 0;

  if (discount.type === 'percent') {
    return roundMoney(Math.min(subtotal, (subtotal * discountValue) / 100));
  }

  return roundMoney(Math.min(subtotal, discountValue));
}

export function calculateBillTotalsPreview(params: {
  subtotal: number;
  discount?: { enabled?: boolean; type?: 'amount' | 'percent'; value?: number };
  billingConfig?: ShopBillingConfig | null;
}): BillTotalsPreview {
  const config = normalizeBillingConfig(params.billingConfig);
  const subtotal = roundMoney(Math.max(0, Number(params.subtotal) || 0));
  const discountAmount = calculateDiscountAmount(subtotal, params.discount);
  const taxableAmount = roundMoney(Math.max(0, subtotal - discountAmount));

  const taxBreakdown = config.taxes
    .filter((entry: ShopTaxConfig) => entry.enabled)
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      rate: entry.rate,
      amount: roundMoney((taxableAmount * entry.rate) / 100),
    }));

  const taxAmount = roundMoney(taxBreakdown.reduce((sum, entry) => sum + entry.amount, 0));
  const totalAmount = roundMoney(taxableAmount + taxAmount);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    taxBreakdown,
    totalAmount,
    serviceChargeAmount: 0,
    serviceChargeBreakdown: [],
  };
}

export function hasBillAdjustments(preview: BillTotalsPreview): boolean {
  return preview.discountAmount > 0 || preview.taxAmount > 0;
}

export function hasEnabledShopTaxes(
  billingConfig?: ShopBillingConfig | null,
): boolean {
  return normalizeBillingConfig(billingConfig).taxes.some(
    (entry) => entry.enabled && entry.rate > 0,
  );
}

export function calculateQuotationTotalsPreview(params: {
  subtotal: number;
  includeTaxes: boolean;
  billingConfig?: ShopBillingConfig | null;
  discount?: { enabled?: boolean; type?: 'amount' | 'percent'; value?: number };
}): BillTotalsPreview {
  return calculateBillTotalsPreview({
    subtotal: params.subtotal,
    discount: params.discount ?? { enabled: false },
    billingConfig: params.includeTaxes ? params.billingConfig : createEmptyBillingConfig(),
  });
}
