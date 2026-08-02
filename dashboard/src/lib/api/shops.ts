import { api } from './axios';
import type {
  ActiveShopDetailsResponse,
  ActiveShopPaymentDetailsResponse,
  ActiveShopPaymentsResponse,
  ActiveShopsResponse,
  ClearActiveShopDataResponse,
  DeleteActiveShopPaymentResponse,
  FetchActiveShopPaymentsParams,
  FetchActiveShopsParams,
  FinishTrialShopResponse,
  OnboardingShopDetailsResponse,
  OnboardUsersResponse,
  TrialShopDetailsResponse,
  TrialShopStatus,
  TrialShopsResponse,
  UpdateActiveShopPaymentPayload,
  UpdateActiveShopPaymentResponse,
  UpdateActiveShopPayload,
  UpdateActiveShopResponse,
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

export async function fetchTrialShops(
  status?: TrialShopStatus,
): Promise<TrialShopsResponse> {
  const response = await api.get<TrialShopsResponse>('/api/dashboard/shops/trial-shops', {
    params: status ? { status } : undefined,
  });
  return response.data;
}

export async function fetchTrialShopDetails(
  shopId: string,
): Promise<TrialShopDetailsResponse> {
  const response = await api.get<TrialShopDetailsResponse>(
    `/api/dashboard/shops/trial-shops/${encodeURIComponent(shopId)}`,
  );
  return response.data;
}

export async function finishTrialShop(shopId: string): Promise<FinishTrialShopResponse> {
  const response = await api.post<FinishTrialShopResponse>(
    `/api/dashboard/shops/trial-shops/${encodeURIComponent(shopId)}/finish-trial`,
  );
  return response.data;
}

export async function fetchActiveShops(
  params: FetchActiveShopsParams = {},
): Promise<ActiveShopsResponse> {
  const query: Record<string, string> = {};
  if (params.status) query.status = params.status;
  if (params.ownerMobileNumber?.trim()) {
    query.ownerMobileNumber = params.ownerMobileNumber.trim();
  }
  if (params.shopId?.trim()) query.shopId = params.shopId.trim();

  const response = await api.get<ActiveShopsResponse>(
    '/api/dashboard/shops/active-shops',
    { params: Object.keys(query).length ? query : undefined },
  );
  return response.data;
}

export async function fetchActiveShopDetails(
  shopId: string,
): Promise<ActiveShopDetailsResponse> {
  const response = await api.get<ActiveShopDetailsResponse>(
    `/api/dashboard/shops/active-shops/${encodeURIComponent(shopId)}`,
  );
  return response.data;
}

export async function updateActiveShopDetails(
  shopId: string,
  payload: UpdateActiveShopPayload,
): Promise<UpdateActiveShopResponse> {
  const response = await api.put<UpdateActiveShopResponse>(
    `/api/dashboard/shops/active-shops/${encodeURIComponent(shopId)}`,
    payload,
  );
  return response.data;
}

export async function clearActiveShopData(
  shopId: string,
  confirmShopId: string,
): Promise<ClearActiveShopDataResponse> {
  const response = await api.delete<ClearActiveShopDataResponse>(
    `/api/dashboard/shops/active-shops/${encodeURIComponent(shopId)}/clear-data`,
    { data: { confirmShopId } },
  );
  return response.data;
}

export async function fetchActiveShopPayments(
  shopId: string,
  params: FetchActiveShopPaymentsParams = {},
): Promise<ActiveShopPaymentsResponse> {
  const query: Record<string, string> = {};
  if (params.paymentType) query.paymentType = params.paymentType;
  if (params.status) query.status = params.status;

  const response = await api.get<ActiveShopPaymentsResponse>(
    `/api/dashboard/shops/active-shops/${encodeURIComponent(shopId)}/payments`,
    { params: Object.keys(query).length ? query : undefined },
  );
  return response.data;
}

export async function fetchActiveShopPaymentDetails(
  shopId: string,
  paymentId: string,
): Promise<ActiveShopPaymentDetailsResponse> {
  const response = await api.get<ActiveShopPaymentDetailsResponse>(
    `/api/dashboard/shops/active-shops/${encodeURIComponent(shopId)}/payments/${encodeURIComponent(paymentId)}`,
  );
  return response.data;
}

export async function updateActiveShopPayment(
  shopId: string,
  paymentId: string,
  payload: UpdateActiveShopPaymentPayload,
): Promise<UpdateActiveShopPaymentResponse> {
  const response = await api.put<UpdateActiveShopPaymentResponse>(
    `/api/dashboard/shops/active-shops/${encodeURIComponent(shopId)}/payments/${encodeURIComponent(paymentId)}`,
    payload,
  );
  return response.data;
}

export async function deleteActiveShopPayment(
  shopId: string,
  paymentId: string,
): Promise<DeleteActiveShopPaymentResponse> {
  const response = await api.delete<DeleteActiveShopPaymentResponse>(
    `/api/dashboard/shops/active-shops/${encodeURIComponent(shopId)}/payments/${encodeURIComponent(paymentId)}`,
  );
  return response.data;
}
