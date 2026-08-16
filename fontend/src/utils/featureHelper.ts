import type { LoginShop } from '../type/auth';

/** Dashboard-controlled product warranty module (read-only on mobile). */
export function hasWarrantyModule(shop: LoginShop | null | undefined): boolean {
  return shop?.warrantyModule === true;
}

/** Match backend resolveQuotationsModule — includes legacy automotive flag. */
export function resolveQuotationsModule(shop: LoginShop | null | undefined): boolean {
  if (shop?.quotationsModule === true) {
    return true;
  }

  if (shop?.quotationsModule === false) {
    return false;
  }

  const legacyAutomotive = shop?.automotiveModule as { quotations?: boolean } | null | undefined;
  return Boolean(legacyAutomotive?.quotations);
}

/** Dashboard-controlled quotations module (read-only on mobile). */
export function hasQuotationsModule(shop: LoginShop | null | undefined): boolean {
  return resolveQuotationsModule(shop);
}
