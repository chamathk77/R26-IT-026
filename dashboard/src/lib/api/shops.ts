import { api } from './axios';
import type {
  OnboardingShopDetailsResponse,
  OnboardUsersResponse,
  UpdateOnboardingShopPayload,
  UpdateOnboardingShopResponse,
} from './shops.types';

export async function fetchOnboardUsers(): Promise<OnboardUsersResponse> {
  const response = await api.get<OnboardUsersResponse>(
    '/api/dashboard/shops/onboard-users',
  );
  return response.data;
}

export async function fetchOnboardingShopDetails(
  shopId: string,
): Promise<OnboardingShopDetailsResponse> {
  const response = await api.get<OnboardingShopDetailsResponse>(
    `/api/dashboard/shops/onboard-users/${encodeURIComponent(shopId)}`,
  );
  return response.data;
}

export async function updateOnboardingShop(
  shopId: string,
  payload: UpdateOnboardingShopPayload,
): Promise<UpdateOnboardingShopResponse> {
  const response = await api.put<UpdateOnboardingShopResponse>(
    `/api/dashboard/shops/onboard-users/${encodeURIComponent(shopId)}`,
    payload,
  );
  return response.data;
}
