import { DASHBOARD_TOKEN_COOKIE } from './constants';

export function setAuthCookie(token: string, maxAgeSeconds: number): void {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${DASHBOARD_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function clearAuthCookie(): void {
  document.cookie = `${DASHBOARD_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
