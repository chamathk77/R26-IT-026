export { printerService } from './PrinterService';
export {
  DEFAULT_PRINTER_PORT,
  DEFAULT_CONNECT_TIMEOUT_MS,
} from './printerTypes';
export type {
  LanPrinterConfig,
  PrinterActionResult,
  PrinterConfig,
  PrinterConnectionMode,
  PrinterConnectionState,
  PrinterConnectResult,
  PrinterErrorCode,
  PrinterErrorResult,
  PrinterStatusSnapshot,
  UsbDeviceListResult,
  UsbPrinterConfig,
  UsbPrinterDevice,
} from './printerTypes';
export {
  clearSavedPrinterConfig,
  getSavedPrinterConfig,
  savePrinterConfig,
} from './printerStorage';
export { isValidIpv4, parsePrinterPort } from './printerValidation';
