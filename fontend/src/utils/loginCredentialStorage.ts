import * as SecureStore from "expo-secure-store";

const STORAGE_KEYS = {
  phone: "login_saved_phone",
  encryptedPassword: "login_saved_password_enc",
  encryptionKey: "login_cred_encryption_key",
} as const;

export type SavedLoginCredentials = {
  phone: string;
  password: string;
};

async function getOrCreateEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(STORAGE_KEYS.encryptionKey);
  if (!key) {
    key = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0"),
    ).join("");
    await SecureStore.setItemAsync(STORAGE_KEYS.encryptionKey, key);
  }
  return key;
}

function xorTransform(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i += 1) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return result;
}

function toHex(value: string): string {
  let hex = "";
  for (let i = 0; i < value.length; i += 1) {
    hex += value.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

function fromHex(hex: string): string {
  let value = "";
  for (let i = 0; i < hex.length; i += 2) {
    value += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return value;
}

async function encryptPassword(password: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  return toHex(xorTransform(password, key));
}

async function decryptPassword(encryptedHex: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  return xorTransform(fromHex(encryptedHex), key);
}

export async function getSavedLoginCredentials(): Promise<SavedLoginCredentials | null> {
  const phone = await SecureStore.getItemAsync(STORAGE_KEYS.phone);
  const encryptedPassword = await SecureStore.getItemAsync(
    STORAGE_KEYS.encryptedPassword,
  );

  if (!phone || !encryptedPassword) {
    return null;
  }

  try {
    const password = await decryptPassword(encryptedPassword);
    return { phone, password };
  } catch {
    await clearSavedLoginCredentials();
    return null;
  }
}

export async function saveLoginCredentials(
  phone: string,
  password: string,
): Promise<void> {
  const encryptedPassword = await encryptPassword(password);
  await SecureStore.setItemAsync(STORAGE_KEYS.phone, phone);
  await SecureStore.setItemAsync(
    STORAGE_KEYS.encryptedPassword,
    encryptedPassword,
  );
}

export async function clearSavedLoginCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.phone);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.encryptedPassword);
}
