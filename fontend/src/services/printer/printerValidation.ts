import type { PrinterErrorResult } from './printerTypes';

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;

export function isValidIpv4(ip: string): boolean {
  return IPV4_REGEX.test(ip.trim());
}

export function parsePrinterPort(value: string | number): number | null {
  const port = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }
  return port;
}

export function createPrinterError(
  code: PrinterErrorResult['code'],
  message: string,
): PrinterErrorResult {
  return { success: false, code, message };
}
