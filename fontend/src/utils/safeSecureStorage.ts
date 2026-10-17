import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    if (typeof SecureStore.isAvailableAsync === 'function') {
      return await SecureStore.isAvailableAsync();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely store a key-value pair using SecureStore on mobile or localStorage on web.
 */
export async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (err) {
    console.warn(`[safeSecureStorage] Could not set item for key "${key}":`, err);
  }
}

/**
 * Safely retrieve a stored string by key.
 */
export async function safeGetItem(key: string): Promise<string | null> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      return await SecureStore.getItemAsync(key);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  } catch (err) {
    console.warn(`[safeSecureStorage] Could not get item for key "${key}":`, err);
    return null;
  }
}

/**
 * Safely delete a stored key.
 */
export async function safeDeleteItem(key: string): Promise<void> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn(`[safeSecureStorage] Could not delete item for key "${key}":`, err);
  }
}
