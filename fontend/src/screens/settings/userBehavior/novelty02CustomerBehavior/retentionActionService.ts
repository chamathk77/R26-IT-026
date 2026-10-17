import { apiClient } from '../../../../../config/apiConfig';
import { ensureInternetConnection } from '../../../../utils/checkInternetConnection';
import { toApiErrorResponse } from '../../../../utils/apiErrorAlert';
import type {
  CreateRetentionActionPayload,
  DeleteRetentionActionResponse,
  GetRetentionActionsResponse,
  RetentionAction,
  SingleRetentionActionResponse,
  UpdateRetentionActionPayload,
} from './retentionActionTypes';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Fetch all retention actions for the current shop and branch.
 */
export async function fetchRetentionActions(filters?: {
  status?: string;
  targetSegment?: string;
  priority?: string;
  search?: string;
}): Promise<RetentionAction[]> {
  try {
    await ensureInternetConnection();

    const response = await apiClient.get<GetRetentionActionsResponse>(
      '/api/customer-behavior/actions',
      {
        params: filters,
      },
    );

    if (isHttpSuccess(response.status) && response.data?.success) {
      return response.data.data;
    }

    throw {
      error: 'Error',
      message: response.data?.message || 'Could not load retention actions',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    throw toApiErrorResponse(error);
  }
}

/**
 * Fetch a single retention action by ID.
 */
export async function fetchRetentionActionById(id: string): Promise<RetentionAction> {
  try {
    await ensureInternetConnection();

    const response = await apiClient.get<SingleRetentionActionResponse>(
      `/api/customer-behavior/actions/${id}`,
    );

    if (isHttpSuccess(response.status) && response.data?.success) {
      return response.data.data;
    }

    throw {
      error: 'Error',
      message: response.data?.message || 'Could not load retention action details',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    throw toApiErrorResponse(error);
  }
}

/**
 * Create a new retention action.
 */
export async function createRetentionAction(
  payload: CreateRetentionActionPayload,
): Promise<RetentionAction> {
  try {
    await ensureInternetConnection();

    const response = await apiClient.post<SingleRetentionActionResponse>(
      '/api/customer-behavior/actions',
      payload,
    );

    if (isHttpSuccess(response.status) && response.data?.success) {
      return response.data.data;
    }

    throw {
      error: 'Error',
      message: response.data?.message || 'Could not create retention action',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    throw toApiErrorResponse(error);
  }
}

/**
 * Update an existing retention action.
 */
export async function updateRetentionAction(
  id: string,
  payload: UpdateRetentionActionPayload,
): Promise<RetentionAction> {
  try {
    await ensureInternetConnection();

    const response = await apiClient.patch<SingleRetentionActionResponse>(
      `/api/customer-behavior/actions/${id}`,
      payload,
    );

    if (isHttpSuccess(response.status) && response.data?.success) {
      return response.data.data;
    }

    throw {
      error: 'Error',
      message: response.data?.message || 'Could not update retention action',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    throw toApiErrorResponse(error);
  }
}

/**
 * Delete a retention action by ID.
 */
export async function deleteRetentionAction(id: string): Promise<boolean> {
  try {
    await ensureInternetConnection();

    const response = await apiClient.delete<DeleteRetentionActionResponse>(
      `/api/customer-behavior/actions/${id}`,
    );

    if (isHttpSuccess(response.status) && response.data?.success) {
      return true;
    }

    throw {
      error: 'Error',
      message: response.data?.message || 'Could not delete retention action',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    throw toApiErrorResponse(error);
  }
}
