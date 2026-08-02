import { getApiBaseUrl } from '../../config/apiConfig';

export function resolveProductImageUri(image?: string | null): string | null {
  const trimmed = image?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = getApiBaseUrl().replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}
