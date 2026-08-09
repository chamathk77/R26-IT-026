import { api } from './axios';
import type {
  CreateDashboardUserPayload,
  CreateDashboardUserResponse,
  DashboardUserDetailsResponse,
  DashboardUsersResponse,
  DeleteDashboardUserResponse,
  UpdateDashboardUserPayload,
  UpdateDashboardUserResponse,
} from './users.types';

export async function fetchDashboardUsers(): Promise<DashboardUsersResponse> {
  const response = await api.get<DashboardUsersResponse>('/api/dashboard/users');
  return response.data;
}

export async function fetchDashboardUserDetails(
  userId: string,
): Promise<DashboardUserDetailsResponse> {
  const response = await api.get<DashboardUserDetailsResponse>(
    `/api/dashboard/users/${encodeURIComponent(userId)}`,
  );
  return response.data;
}

export async function createDashboardUser(
  payload: CreateDashboardUserPayload,
): Promise<CreateDashboardUserResponse> {
  const response = await api.post<CreateDashboardUserResponse>(
    '/api/dashboard/users',
    payload,
  );
  return response.data;
}

export async function updateDashboardUser(
  userId: string,
  payload: UpdateDashboardUserPayload,
): Promise<UpdateDashboardUserResponse> {
  const response = await api.put<UpdateDashboardUserResponse>(
    `/api/dashboard/users/${encodeURIComponent(userId)}`,
    payload,
  );
  return response.data;
}

export async function deleteDashboardUser(
  userId: string,
): Promise<DeleteDashboardUserResponse> {
  const response = await api.delete<DeleteDashboardUserResponse>(
    `/api/dashboard/users/${encodeURIComponent(userId)}`,
  );
  return response.data;
}
