import { apiClient } from '../../../../../config/apiConfig';
import { ensureInternetConnection } from '../../../../utils/checkInternetConnection';
import { toApiErrorResponse } from '../../../../utils/apiErrorAlert';
import type { GetProductDemandForecastResponse, ProductDemandData } from './productDemandTypes';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Deliberately plain (no Redux slice), matching the other two novelties —
 * keeps this novelty conflict-free to merge alongside them.
 */
export async function fetchProductDemandForecast(): Promise<ProductDemandData> {
  try {
    await ensureInternetConnection();

    const response = await apiClient.get<GetProductDemandForecastResponse>(
      '/api/product-demand/forecast',
    );

    if (isHttpSuccess(response.status) && response.data?.success) {
      return response.data.data;
    }

    throw {
      error: 'Error',
      message: response.data?.message || 'Could not load the product demand forecast',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    throw toApiErrorResponse(error);
  }
}
