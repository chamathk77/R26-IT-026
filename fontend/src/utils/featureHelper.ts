import type { LoginShop } from '../type/auth';

/** Dashboard-controlled product warranty module (read-only on mobile). */
export function hasWarrantyModule(shop: LoginShop | null | undefined): boolean {
  return shop?.warrantyModule === true;
}
