import { apiClient } from '../../config/apiConfig';
import { ensureInternetConnection } from '../utils/checkInternetConnection';
import { GetPaymentsByShopResponse } from '../type/payment';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export async function fetchPaymentsByShop(
  shopId: string,
): Promise<GetPaymentsByShopResponse> {
  await ensureInternetConnection();

  const response = await apiClient.get<GetPaymentsByShopResponse>(
    `/api/payments/shop/${encodeURIComponent(shopId)}`,
  );

  if (isHttpSuccess(response.status) && response.data?.success) {
    return response.data;
  }

  throw new Error('Could not load payments');
}
