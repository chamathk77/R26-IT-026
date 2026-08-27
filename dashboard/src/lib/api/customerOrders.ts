import { publicApi } from '@/lib/api/publicApi';
import type {
  CustomerMenu,
  CustomerOrder,
  CustomerRecommendationsRequest,
  CustomerRecommendationsResponse,
  PlaceCustomerOrderRequest,
  PlacedCustomerOrder,
} from '@/lib/api/customerOrders.types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

function basePath(shopId: string, branchId: string): string {
  return `/api/customer-orders/${encodeURIComponent(shopId)}/${encodeURIComponent(branchId)}`;
}

export async function fetchCustomerMenu(
  shopId: string,
  branchId: string,
): Promise<CustomerMenu> {
  const { data } = await publicApi.get<ApiEnvelope<CustomerMenu>>(
    `${basePath(shopId, branchId)}/menu`,
  );
  return data.data;
}

export async function placeCustomerOrder(
  shopId: string,
  branchId: string,
  payload: PlaceCustomerOrderRequest,
): Promise<PlacedCustomerOrder> {
  const { data } = await publicApi.post<ApiEnvelope<PlacedCustomerOrder>>(
    `${basePath(shopId, branchId)}/orders`,
    payload,
  );
  return data.data;
}

export async function fetchCustomerOrders(
  shopId: string,
  branchId: string,
  phone: string,
): Promise<CustomerOrder[]> {
  const { data } = await publicApi.get<ApiEnvelope<CustomerOrder[]>>(
    `${basePath(shopId, branchId)}/orders`,
    { params: { phone } },
  );
  return data.data ?? [];
}

export async function fetchCustomerRecommendations(
  shopId: string,
  branchId: string,
  payload: CustomerRecommendationsRequest,
): Promise<CustomerRecommendationsResponse> {
  const { data } = await publicApi.post<ApiEnvelope<CustomerRecommendationsResponse>>(
    `${basePath(shopId, branchId)}/recommendations`,
    payload,
  );
  return data.data;
}
