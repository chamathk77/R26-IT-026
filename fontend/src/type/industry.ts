export type IndustryType = 'retail' | 'restaurant' | 'salon' | 'automotive';

export interface RestaurantModuleFlags {
  kitchenOrders: boolean;
  tableManagement: boolean;
}

export interface SalonModuleFlags {
  appointments: boolean;
}

export interface AutomotiveModuleFlags {
  quotations: boolean;
  warranty: boolean;
}

export interface ShopIndustryProfile {
  industryType: IndustryType;
  restaurantModule: RestaurantModuleFlags | null;
  salonModule: SalonModuleFlags | null;
  automotiveModule: AutomotiveModuleFlags | null;
}
