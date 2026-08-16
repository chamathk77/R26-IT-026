import { apiClient } from '../../../../config/apiConfig';
import { ensureInternetConnection } from '../../../utils/checkInternetConnection';
import { toApiErrorResponse } from '../../../utils/apiErrorAlert';
import type { GetSalesCostForecastResponse, SalesCostForecastData } from './forecastTypes';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Deliberately plain (no Redux slice) so this novelty adds no changes to the
 * shared store, keeping merges with the other novelty branches conflict-free.
 */
export async function fetchSalesCostForecast(): Promise<SalesCostForecastData> {
  try {
    await ensureInternetConnection();

    const response = await apiClient.get<GetSalesCostForecastResponse>(
      '/api/forecast/sales-cost',
    );

    if (isHttpSuccess(response.status) && response.data?.success) {
      return response.data.data;
    }

    throw {
      error: 'Error',
      message: response.data?.message || 'Could not load the forecast',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    throw toApiErrorResponse(error);
  }
}
