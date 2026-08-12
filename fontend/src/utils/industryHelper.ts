import type { LoginShop } from '../type/auth';
import type {
  AutomotiveModuleFlags,
  IndustryType,
  RestaurantModuleFlags,
  SalonModuleFlags,
  ShopIndustryProfile,
} from '../type/industry';

export const INDUSTRY_TYPES: IndustryType[] = ['retail', 'restaurant', 'salon', 'automotive'];

export function normalizeIndustryType(value: unknown): IndustryType {
  const normalized = String(value ?? 'retail')
    .trim()
    .toLowerCase();
  return INDUSTRY_TYPES.includes(normalized as IndustryType)
    ? (normalized as IndustryType)
    : 'retail';
}

export function resolveShopIndustry(
  shop: LoginShop | null | undefined,
): ShopIndustryProfile {
  const industryType = normalizeIndustryType(shop?.industryType);

  const restaurantModule: RestaurantModuleFlags | null =
    industryType === 'restaurant' && shop?.restaurantModule
      ? {
          kitchenOrders: Boolean(shop.restaurantModule.kitchenOrders),
          tableManagement: Boolean(shop.restaurantModule.tableManagement),
        }
      : null;

  const salonModule: SalonModuleFlags | null =
    industryType === 'salon' && shop?.salonModule
      ? {
          appointments: Boolean(shop.salonModule.appointments),
        }
      : null;

  const automotiveModule: AutomotiveModuleFlags | null =
    industryType === 'automotive' && shop?.automotiveModule
      ? {
          quotations: Boolean(shop.automotiveModule.quotations),
          warranty: Boolean(shop.automotiveModule.warranty),
        }
      : null;

  return {
    industryType,
    restaurantModule,
    salonModule,
    automotiveModule,
  };
}

export function isRetailShop(shop: LoginShop | null | undefined): boolean {
  return resolveShopIndustry(shop).industryType === 'retail';
}

export function isRestaurantShop(shop: LoginShop | null | undefined): boolean {
  return resolveShopIndustry(shop).industryType === 'restaurant';
}

export function isSalonShop(shop: LoginShop | null | undefined): boolean {
  return resolveShopIndustry(shop).industryType === 'salon';
}

export function isAutomotiveShop(shop: LoginShop | null | undefined): boolean {
  return resolveShopIndustry(shop).industryType === 'automotive';
}

export function hasKitchenOrders(shop: LoginShop | null | undefined): boolean {
  return Boolean(resolveShopIndustry(shop).restaurantModule?.kitchenOrders);
}

export function hasTableManagement(shop: LoginShop | null | undefined): boolean {
  return Boolean(resolveShopIndustry(shop).restaurantModule?.tableManagement);
}

export function hasSalonAppointments(shop: LoginShop | null | undefined): boolean {
  return Boolean(resolveShopIndustry(shop).salonModule?.appointments);
}

export function hasAutomotiveQuotations(shop: LoginShop | null | undefined): boolean {
  return Boolean(resolveShopIndustry(shop).automotiveModule?.quotations);
}

export function hasAutomotiveWarranty(shop: LoginShop | null | undefined): boolean {
  return Boolean(resolveShopIndustry(shop).automotiveModule?.warranty);
}
