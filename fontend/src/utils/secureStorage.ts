import * as SecureStore from "expo-secure-store";

const STORAGE_KEYS = {
  token: "auth_token",
} as const;

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.token, token);
}

export async function getSavedToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.token);
}

export async function clearSavedToken(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.token);
}
