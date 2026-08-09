const DEFAULT_LIVE_API_URL = 'https://168-144-40-49.sslip.io';
const DEFAULT_DEV_API_URL = 'http://localhost:3000';

export type AppEnvironment = 'DEV' | 'LIVE';

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Matches backend ENV: DEV = local API, LIVE = production droplet. */
export function getAppEnvironment(): AppEnvironment {
  const env = trimEnv(process.env.NEXT_PUBLIC_APP_ENV)?.toUpperCase();
  return env === 'LIVE' ? 'LIVE' : 'DEV';
}

export function getApiBaseUrl(): string {
  const explicitOverride = trimEnv(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (explicitOverride) {
    return explicitOverride;
  }

  if (getAppEnvironment() === 'LIVE') {
    return trimEnv(process.env.NEXT_PUBLIC_LIVE_API_URL) || DEFAULT_LIVE_API_URL;
  }

  return trimEnv(process.env.NEXT_PUBLIC_DEV_API_URL) || DEFAULT_DEV_API_URL;
}
