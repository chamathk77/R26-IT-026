import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import type { LoginShop } from '../type/auth';
import type { ShopIndustryProfile } from '../type/industry';
import { resolveShopIndustry } from '../utils/industryHelper';

export interface UseShopIndustryResult extends ShopIndustryProfile {
  shop: LoginShop | null;
}

export function useShopIndustry(): UseShopIndustryResult {
  const shop = useSelector((state: RootState) => state.AuthReducer.Login.shopData);

  const industry = useMemo(() => resolveShopIndustry(shop), [shop]);

  return {
    shop,
    ...industry,
  };
}
