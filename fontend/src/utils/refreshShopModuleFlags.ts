import type { AppDispatch } from '../store/store';
import { patchLoginShopData } from '../store/reducers/AuthReducer';
import { fetchSettingsData_Service } from '../services/SettingsService';
import { resolveQuotationsModule } from './featureHelper';

/** Pull latest dashboard-controlled module flags into Redux shop session. */
export async function refreshShopModuleFlags(dispatch: AppDispatch): Promise<void> {
  try {
    const response = await dispatch(fetchSettingsData_Service()).unwrap();
    const shop = response.shop;
    if (!shop) return;

    dispatch(
      patchLoginShopData({
        quotationsModule: resolveQuotationsModule(shop),
        warrantyModule: shop.warrantyModule === true,
        billingConfig: shop.billingConfig,
        kpi: shop.kpi,
        analyticsModule: shop.analyticsModule,
        costModule: shop.costModule,
        marketingModule: shop.marketingModule,
        customerManualOrder: shop.customerManualOrder,
      }),
    );
  } catch {
    // Keep cached shop flags when refresh fails offline or session expired.
  }
}
