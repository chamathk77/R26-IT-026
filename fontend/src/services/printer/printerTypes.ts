export const DEFAULT_PRINTER_PORT = 9100;
export const DEFAULT_CONNECT_TIMEOUT_MS = 8000;

/** Cashier receipt vs kitchen KOT printer. */
export type PrinterRole = 'receipt' | 'kitchen';

export type PrinterConnectionMode = 'lan' | 'usb';

export type PrinterConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type PrinterErrorCode =
  | 'INVALID_IP'
  | 'INVALID_PORT'
  | 'NETWORK_DISCONNECTED'
  | 'CONNECTION_TIMEOUT'
  | 'PRINTER_OFFLINE'
  | 'SOCKET_ERROR'
  | 'NOT_CONNECTED'
  | 'ALREADY_CONNECTED'
  | 'NATIVE_MODULE_UNAVAILABLE'
  | 'USB_NOT_SUPPORTED'
  | 'USB_NO_DEVICES'
  | 'USB_DEVICE_NOT_FOUND'
  | 'USB_CONNECT_FAILED'
  | 'UNKNOWN';

export type UsbPrinterDevice = {
  deviceName: string;
  vendorId: string;
  productId: string;
};

export type LanPrinterConfig = {
  mode: 'lan';
  ip: string;
  port: number;
};

export type UsbPrinterConfig = {
  mode: 'usb';
  device: UsbPrinterDevice;
};

export type PrinterConfig = LanPrinterConfig | UsbPrinterConfig;

export type PrinterConnectResult = {
  success: true;
  mode: PrinterConnectionMode;
  target: string;
  message: string;
};

export type PrinterErrorResult = {
  success: false;
  code: PrinterErrorCode;
  message: string;
};

export type PrinterActionResult = PrinterConnectResult | PrinterErrorResult;

export type PrinterStatusSnapshot = {
  state: PrinterConnectionState;
  mode: PrinterConnectionMode | null;
  /** "192.168.1.100:9100" for LAN, device name for USB */
  target: string | null;
  lastError: PrinterErrorResult | null;
  isConnected: boolean;
};

export type UsbDeviceListResult =
  | { success: true; devices: UsbPrinterDevice[] }
  | PrinterErrorResult;
