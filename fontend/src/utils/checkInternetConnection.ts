import * as Network from 'expo-network';
import { ApiErrorResponse } from '../type/common';

function isLiveEnvironment(): boolean {
  const env = process.env.EXPO_PUBLIC_APP_ENV?.trim().toUpperCase();
  return env === 'LIVE';
}

export async function ensureInternetConnection(): Promise<void> {
  const networkState = await Network.getNetworkStateAsync();
  const isConnected = Boolean(networkState.isConnected);
  const isInternetReachable = networkState.isInternetReachable;

  // DEV + local backend: shop Wi‑Fi without internet must still reach LAN API.
  const requiresInternet = isLiveEnvironment();
  const hasInternet =
    isConnected &&
    (!requiresInternet ||
      isInternetReachable === null ||
      isInternetReachable === true);

  if (!hasInternet) {
    const apiError: ApiErrorResponse = {
      error: "Error",
      message: "No internet connection. Please check your network.",
      status: 0,
      timestamp: new Date().toISOString(),
    };

    throw apiError;
  }
}
