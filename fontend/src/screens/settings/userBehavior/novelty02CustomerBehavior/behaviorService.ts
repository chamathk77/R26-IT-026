import { apiClient } from '../../../../../config/apiConfig';
import { ensureInternetConnection } from '../../../../utils/checkInternetConnection';
import { toApiErrorResponse } from '../../../../utils/apiErrorAlert';
import type { CustomerBehaviorData, GetCustomerBehaviorInsightsResponse } from './behaviorTypes';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Deliberately plain (no Redux slice), matching novelty01's forecastService —
 * keeps this novelty conflict-free to merge alongside the others.
 */
export async function fetchCustomerBehaviorInsights(): Promise<CustomerBehaviorData> {
  try {
    await ensureInternetConnection();

    const response = await apiClient.get<GetCustomerBehaviorInsightsResponse>(
      '/api/customer-behavior/insights',
    );

    if (isHttpSuccess(response.status) && response.data?.success) {
      return response.data.data;
    }

    throw {
      error: 'Error',
      message: response.data?.message || 'Could not load customer behavior insights',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    throw toApiErrorResponse(error);
  }
}
