import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ensureInternetConnection } from '../src/utils/checkInternetConnection';
import { getSavedToken } from '../src/utils/secureStorage';

function trimEnv(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t || undefined;
}

const DEFAULT_LIVE_API_URL = 'https://168-144-40-49.sslip.io';
const LOCAL_BACKEND_PORT = 3000;

export type AppEnvironment = 'DEV' | 'LIVE';

/** Matches backend ENV: DEV = local API, LIVE = production droplet. */
export function getAppEnvironment(): AppEnvironment {
  const env = trimEnv(process.env.EXPO_PUBLIC_APP_ENV)?.toUpperCase();
  return env === 'LIVE' ? 'LIVE' : 'DEV';
}

function resolveDevMachineHost(): string | undefined {
  // Expo Go: debuggerHost (e.g. 192.168.1.6:8081).
  // Dev build: expoConfig.hostUri from Metro (same shape).
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ?? Constants.expoConfig?.hostUri;

  if (!debuggerHost) {
    return undefined;
  }

  const hostname = debuggerHost.split(':')[0];
  const isTunnelHost =
    hostname.includes('exp.direct') || hostname.includes('ngrok-free.app');

  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    isTunnelHost
  ) {
    return undefined;
  }

  return hostname;
}

function resolveLocalDevApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    return `http://localhost:${LOCAL_BACKEND_PORT}`;
  }

  const explicitDevUrl = trimEnv(process.env.EXPO_PUBLIC_DEV_API_URL);

  const devMachineHost = resolveDevMachineHost();
  const autoDetectedUrl = devMachineHost
    ? `http://${devMachineHost}:${LOCAL_BACKEND_PORT}`
    : undefined;

  if (autoDetectedUrl && explicitDevUrl) {
    try {
      const explicitHost = new URL(explicitDevUrl).hostname;
      const autoHost = new URL(autoDetectedUrl).hostname;
      if (explicitHost !== autoHost) {
        if (__DEV__) {
          console.warn(
            `[API] EXPO_PUBLIC_DEV_API_URL host (${explicitHost}) differs from Expo LAN (${autoHost}); using ${autoDetectedUrl}`,
          );
        }
        return autoDetectedUrl;
      }
    } catch {
      // Fall through to explicit or default resolution.
    }
  }

  if (explicitDevUrl) {
    return explicitDevUrl;
  }

  if (autoDetectedUrl) {
    return autoDetectedUrl;
  }

  // Android emulator: special alias to the host running the backend.
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${LOCAL_BACKEND_PORT}`;
  }

  // iOS simulator / web on same machine as the API.
  return `http://localhost:${LOCAL_BACKEND_PORT}`;
}

/** Expo exposes env vars prefixed with EXPO_PUBLIC_ to the client bundle. */
function resolveApiBaseUrl(): string {
  const explicitOverride =
    trimEnv(process.env.EXPO_PUBLIC_BASE_URL) || trimEnv(process.env.BASE_URL);
  if (explicitOverride) {
    return explicitOverride;
  }

  if (getAppEnvironment() === 'LIVE') {
    return trimEnv(process.env.EXPO_PUBLIC_LIVE_API_URL) || DEFAULT_LIVE_API_URL;
  }

  return resolveLocalDevApiBaseUrl();
}

const API_BASE_URL = resolveApiBaseUrl();

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'current_password',
  'new_password',
]);

function redactForLog(data: unknown): unknown {
  if (data == null) return data;
  if (Array.isArray(data)) {
    return data.map((item) => redactForLog(item));
  }
  if (typeof data === 'object') {
    const out: Record<string, unknown> = { ...(data as Record<string, unknown>) };
    for (const key of Object.keys(out)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lower)) {
        out[key] = '***';
      } else if (typeof out[key] === 'object' && out[key] !== null) {
        out[key] = redactForLog(out[key]);
      }
    }
    return out;
  }
  return data;
}

export class ApiClientError extends Error {
  status?: number;
  code?: string;
  sessionEnded?: boolean;
  tokenExpired?: boolean;
  tokenInvalid?: boolean;
  trialExpired?: boolean;
  shopId?: string;
  onboardStep?: string;
  shop?: Record<string, unknown> | null;
  errors?: string[];

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      sessionEnded?: boolean;
      tokenExpired?: boolean;
      tokenInvalid?: boolean;
      trialExpired?: boolean;
      shopId?: string;
      onboardStep?: string;
      shop?: Record<string, unknown> | null;
      errors?: string[];
    },
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = options?.status;
    this.code = options?.code;
    this.sessionEnded = options?.sessionEnded;
    this.tokenExpired = options?.tokenExpired;
    this.tokenInvalid = options?.tokenInvalid;
    this.trialExpired = options?.trialExpired;
    this.shopId = options?.shopId;
    this.onboardStep = options?.onboardStep;
    this.shop = options?.shop;
    this.errors = options?.errors;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    await ensureInternetConnection();
    const token = await getSavedToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
);

if (__DEV__) {
  console.log(`[API] env=${getAppEnvironment()} baseURL=${API_BASE_URL}`);

  apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const fullUrl = axios.getUri(config);
    const method = (config.method ?? 'get').toUpperCase();
    console.log(`[API] → ${method} ${fullUrl}`);
    if (config.baseURL) {
      console.log('[API]   baseURL:', config.baseURL);
    }
    if (config.params != null) {
      console.log('[API]   params:', redactForLog(config.params));
    }
    if (config.data != null) {
      console.log('[API]   body:', redactForLog(config.data));
    }
    return config;
  });
}

apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      const fullUrl = axios.getUri(response.config);
      const method = (response.config.method ?? 'get').toUpperCase();
      console.log(
        `[API] ← ${response.status} ${method} ${fullUrl}`,
      );
    }
    return response;
  },
  (error: AxiosError) => {
    if (__DEV__ && error.config) {
      const fullUrl = axios.getUri(error.config);
      const method = (error.config.method ?? 'get').toUpperCase();
      const status = error.response?.status ?? '—';
      console.log(`[API] ← error ${status} ${method} ${fullUrl}`);
      if (error.response?.data != null) {
        console.log('[API]   error body:', error.response.data);
      }
    }
    const errorData = (error.response?.data as {
      message?: string;
      code?: string;
      shopId?: string;
      onboardStep?: string;
      shop?: Record<string, unknown> | null;
      sessionEnded?: boolean;
      tokenExpired?: boolean;
      tokenInvalid?: boolean;
      trialExpired?: boolean;
      errors?: string[];
    } | undefined) ?? {};

    const message =
      errorData.message ||
      error.message ||
      'Something went wrong while calling API.';

    return Promise.reject(
      new ApiClientError(message, {
        status: error.response?.status,
        code: errorData.code,
        shopId: errorData.shopId,
        onboardStep: errorData.onboardStep,
        shop: errorData.shop,
        sessionEnded: errorData.sessionEnded,
        tokenExpired: errorData.tokenExpired,
        tokenInvalid: errorData.tokenInvalid,
        trialExpired: errorData.trialExpired,
        errors: Array.isArray(errorData.errors) ? errorData.errors : undefined,
      }),
    );
  },
);
