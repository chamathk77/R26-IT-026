import * as SecureStore from 'expo-secure-store';
import type { PrinterConfig, PrinterRole } from './printerTypes';
import { DEFAULT_PRINTER_PORT } from './printerTypes';

const LEGACY_STORAGE_KEY = 'lan_printer_config_v1';

const STORAGE_KEYS: Record<PrinterRole, string> = {
  receipt: 'printer_config_receipt_v1',
  kitchen: 'printer_config_kitchen_v1',
};

const ENABLED_KEYS: Record<PrinterRole, string> = {
  receipt: 'printer_enabled_receipt_v1',
  kitchen: 'printer_enabled_kitchen_v1',
};

function parseStoredConfig(raw: string): PrinterConfig | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (parsed.mode === 'usb') {
      const device = parsed.device as
        | { deviceName?: string; vendorId?: string; productId?: string }
        | undefined;
      if (!device?.vendorId || !device?.productId) {
        return null;
      }
      return {
        mode: 'usb',
        device: {
          deviceName: device.deviceName ?? 'USB printer',
          vendorId: String(device.vendorId),
          productId: String(device.productId),
        },
      };
    }

    const ip = typeof parsed.ip === 'string' ? parsed.ip.trim() : '';
    const port =
      typeof parsed.port === 'number' && Number.isFinite(parsed.port)
        ? parsed.port
        : DEFAULT_PRINTER_PORT;

    if (!ip) {
      return null;
    }

    return { mode: 'lan', ip, port };
  } catch {
    return null;
  }
}

export async function savePrinterConfig(
  role: PrinterRole,
  config: PrinterConfig,
): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS[role], JSON.stringify(config));
}

export async function getSavedPrinterConfig(
  role: PrinterRole,
): Promise<PrinterConfig | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEYS[role]);
  if (raw) {
    return parseStoredConfig(raw);
  }

  // Migrate legacy single-printer config to receipt role.
  if (role === 'receipt') {
    const legacyRaw = await SecureStore.getItemAsync(LEGACY_STORAGE_KEY);
    if (!legacyRaw) {
      return null;
    }

    const migrated = parseStoredConfig(legacyRaw);
    if (migrated) {
      await savePrinterConfig('receipt', migrated);
      await SecureStore.deleteItemAsync(LEGACY_STORAGE_KEY);
    }
    return migrated;
  }

  return null;
}

export async function clearSavedPrinterConfig(role: PrinterRole): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS[role]);
}

/** When false, checkout must not auto-reconnect after the user taps Disconnect. */
export async function isPrinterPrintingEnabled(role: PrinterRole): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(ENABLED_KEYS[role]);
  if (raw == null) {
    return true;
  }
  return raw === 'true';
}

export async function setPrinterPrintingEnabled(
  role: PrinterRole,
  enabled: boolean,
): Promise<void> {
  await SecureStore.setItemAsync(ENABLED_KEYS[role], enabled ? 'true' : 'false');
}
