import { api } from './axios';
import type { ApiErrorBody, LoginResponse } from '@/lib/auth/types';
import axios from 'axios';

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/api/dashboard/auth/login', {
    email,
    password,
  });
  return response.data;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/api/dashboard/auth/logout');
}

export function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? 'Login failed. Please try again.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Login failed. Please try again.';
}
