import * as Network from 'expo-network';
import { ApiErrorResponse } from '../type/common';

export async function ensureInternetConnection(): Promise<void> {
  const networkState = await Network.getNetworkStateAsync();
  const isConnected = Boolean(networkState.isConnected);
  const isInternetReachable = networkState.isInternetReachable;
  const hasInternet =
    isConnected &&
    (isInternetReachable === null || isInternetReachable === true);

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
