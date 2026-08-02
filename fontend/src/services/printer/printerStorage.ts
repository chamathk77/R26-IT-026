import * as SecureStore from 'expo-secure-store';
import type { PrinterConfig } from './printerTypes';
import { DEFAULT_PRINTER_PORT } from './printerTypes';

const STORAGE_KEY = 'lan_printer_config_v1';

export async function savePrinterConfig(config: PrinterConfig): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(config));
}

export async function getSavedPrinterConfig(): Promise<PrinterConfig | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) {
    return null;
  }

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

    // 'lan' mode, or legacy config saved before modes existed ({ ip, port })
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

export async function clearSavedPrinterConfig(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
