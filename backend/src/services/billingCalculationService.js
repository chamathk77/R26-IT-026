const CALCULATION_ORDER = 'discount_then_percentage_charges';

function roundMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
}

function createDefaultBillingConfig() {
  return {
    taxes: [],
  };
}

function normalizeBillingLineId(value, fallback) {
  const trimmed = String(value ?? '').trim();
  return trimmed || fallback;
}

function normalizeTaxEntry(entry, index, errors, prefix) {
  if (!entry || typeof entry !== 'object') {
    errors.push(`${prefix} must be an object`);
    return null;
  }

  const label = String(entry.label ?? '').trim();
  if (!label) {
    errors.push(`${prefix}.label is required`);
    return null;
  }

  const rate = Number(entry.rate ?? entry.value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    errors.push(`${prefix}.rate must be a number between 0 and 100`);
    return null;
  }

  return {
    id: normalizeBillingLineId(entry.id, `tax-${index + 1}`),
    label,
    rate: roundMoney(rate),
    enabled: Boolean(entry.enabled),
  };
}

/** Merge legacy serviceCharges (percentage only) into taxes when reading old shop config. */
function legacyServiceChargesToTaxes(serviceCharges = []) {
  if (!Array.isArray(serviceCharges)) return [];

  return serviceCharges
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => {
      const type = String(entry.type ?? 'percentage').trim().toLowerCase();
      if (type !== 'percentage') return null;
      const rate = Number(entry.value);
      if (!Number.isFinite(rate)) return null;
      return {
        id: normalizeBillingLineId(entry.id, `legacy-service-${index + 1}`),
        label: String(entry.label ?? '').trim() || `Charge ${index + 1}`,
        rate: roundMoney(rate),
        enabled: Boolean(entry.enabled) && entry.autoApply !== false,
      };
    })
    .filter(Boolean);
}

function normalizeBillingConfigInput(raw, errors = []) {
  if (raw === undefined || raw === null) {
    return createDefaultBillingConfig();
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push('billingConfig must be an object');
    return null;
  }

  const taxes = Array.isArray(raw.taxes)
    ? raw.taxes
        .map((entry, index) => normalizeTaxEntry(entry, index, errors, `billingConfig.taxes[${index}]`))
        .filter(Boolean)
    : [];

  const legacyTaxes = legacyServiceChargesToTaxes(raw.serviceCharges);
  const mergedTaxes = [...taxes];

  for (const legacyEntry of legacyTaxes) {
    const duplicate = mergedTaxes.some(
      (entry) => entry.label.toLowerCase() === legacyEntry.label.toLowerCase() && entry.rate === legacyEntry.rate,
    );
    if (!duplicate) {
      mergedTaxes.push(legacyEntry);
    }
  }

  if (raw.taxes !== undefined && !Array.isArray(raw.taxes)) {
    errors.push('billingConfig.taxes must be an array');
  }

  return { taxes: mergedTaxes };
}

function normalizeBillingConfigFromShop(shop) {
  return normalizeBillingConfigInput(shop?.billingConfig ?? createDefaultBillingConfig());
}

function buildBillingSnapshot(billingConfig) {
  const normalized = normalizeBillingConfigFromShop({ billingConfig });
  return {
    calculationOrder: CALCULATION_ORDER,
    taxes: normalized.taxes.filter((entry) => entry.enabled),
  };
}

function calculateDiscountedAmount(subtotal, discount) {
  if (!discount?.enabled) return 0;

  const discountType = String(discount.type ?? '')
    .trim()
    .toLowerCase();
  const discountValue = Number(discount.value);

  if (!Number.isFinite(discountValue) || discountValue <= 0) return 0;

  if (discountType === 'percent' || discountType === 'percentage') {
    return roundMoney(Math.min(subtotal, (subtotal * discountValue) / 100));
  }

  if (discountType === 'amount') {
    return roundMoney(Math.min(subtotal, discountValue));
  }

  return 0;
}

function discountFromCartFlags(cart) {
  if (!cart?.isDiscount) {
    return { enabled: false };
  }

  if (cart.isDiscountPercentage) {
    return { enabled: true, type: 'percent', value: cart.discount };
  }

  if (cart.isDiscountAmount) {
    return { enabled: true, type: 'amount', value: cart.discount };
  }

  return { enabled: true, type: 'amount', value: cart.discountedAmount ?? 0 };
}

function calculateBillTotals({ subtotal, discount, billingConfig }) {
  const normalizedSubtotal = roundMoney(Math.max(0, Number(subtotal) || 0));
  const config = normalizeBillingConfigFromShop({ billingConfig });
  const discountAmount = roundMoney(
    calculateDiscountedAmount(normalizedSubtotal, discount ?? { enabled: false }),
  );
  const taxableAmount = roundMoney(Math.max(0, normalizedSubtotal - discountAmount));

  const taxBreakdown = config.taxes
    .filter((entry) => entry.enabled)
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      rate: entry.rate,
      amount: roundMoney((taxableAmount * entry.rate) / 100),
    }));

  const taxAmount = roundMoney(taxBreakdown.reduce((sum, entry) => sum + entry.amount, 0));
  const totalAmount = roundMoney(taxableAmount + taxAmount);

  return {
    subtotal: normalizedSubtotal,
    discountAmount,
    taxableAmount,
    serviceChargeAmount: 0,
    serviceChargeBreakdown: [],
    taxAmount,
    taxBreakdown,
    totalAmount,
    billingSnapshot: buildBillingSnapshot(config),
  };
}

function calculateBillTotalsFromCart(cart, billingConfig) {
  return calculateBillTotals({
    subtotal: cart?.totalPrice ?? 0,
    discount: discountFromCartFlags(cart),
    billingConfig,
  });
}

function formatBillingConfigForClient(billingConfig) {
  return normalizeBillingConfigFromShop({ billingConfig });
}

module.exports = {
  CALCULATION_ORDER,
  roundMoney,
  createDefaultBillingConfig,
  normalizeBillingConfigInput,
  normalizeBillingConfigFromShop,
  formatBillingConfigForClient,
  buildBillingSnapshot,
  calculateDiscountedAmount,
  calculateBillTotals,
  calculateBillTotalsFromCart,
};
