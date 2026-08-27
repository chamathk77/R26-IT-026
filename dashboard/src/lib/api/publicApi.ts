import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api/config';

/**
 * Axios client for the public customer order pages: no dashboard token and no
 * 401 redirect to /login (those pages are opened by shop customers, not staff).
 */
export const publicApi = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Absolute URL for a product image path returned by the API. */
export function resolveUploadUrl(imagePath?: string | null): string {
  const trimmed = imagePath?.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}
