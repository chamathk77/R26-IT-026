import * as SecureStore from 'expo-secure-store';

/** SecureStore wrapper that never throws — used for non-critical prefs like printer config. */
export async function safeGetItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignore storage failures (e.g. value too large, unavailable platform).
  }
}

export async function safeDeleteItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore delete failures.
  }
}
