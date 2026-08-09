import { Platform } from 'react-native';
import * as Network from 'expo-network';
import {
  DEFAULT_CONNECT_TIMEOUT_MS,
  DEFAULT_PRINTER_PORT,
  type PrinterActionResult,
  type PrinterConnectionMode,
  type PrinterConnectionState,
  type PrinterConnectResult,
  type PrinterErrorResult,
  type PrinterStatusSnapshot,
  type UsbDeviceListResult,
  type UsbPrinterDevice,
} from './printerTypes';
import { createPrinterError, isValidIpv4, parsePrinterPort } from './printerValidation';
import { savePrinterConfig } from './printerStorage';

type TcpSocketLike = {
  on: (event: string, listener: (...args: any[]) => void) => void;
  removeAllListeners: (event?: string) => void;
  destroy: () => void;
};

type TcpSocketModule = {
  createConnection: (
    options: { host: string; port: number; reuseAddress?: boolean },
    callback?: () => void,
  ) => TcpSocketLike;
};

type UsbPrinterModule = {
  init: () => Promise<void>;
  getDeviceList: () => Promise<
    { device_name: string; vendor_id: string; product_id: string }[]
  >;
  connectPrinter: (vendorId: string, productId: string) => Promise<unknown>;
  closeConn: () => Promise<void>;
};

function loadTcpSocketModule(): TcpSocketModule | null {
  try {
    // Native TCP sockets require a custom/dev client build (not Expo Go).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-tcp-socket') as TcpSocketModule;
  } catch {
    return null;
  }
}

function loadUsbPrinterModule(): UsbPrinterModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-thermal-receipt-printer') as {
      USBPrinter?: UsbPrinterModule;
    };
    return mod.USBPrinter ?? null;
  } catch {
    return null;
  }
}

/**
 * Unified connection manager for ESC/POS receipt printers.
 * Supports LAN (raw TCP, default port 9100) and USB (Android only).
 * Connection management only — printing is implemented separately.
 */
class PrinterService {
  private socket: TcpSocketLike | null = null;
  private state: PrinterConnectionState = 'disconnected';
  private mode: PrinterConnectionMode | null = null;
  private currentIp: string | null = null;
  private currentPort: number | null = null;
  private currentUsbDevice: UsbPrinterDevice | null = null;
  private lastError: PrinterErrorResult | null = null;
  private connectPromise: Promise<PrinterActionResult> | null = null;
  private usbInitialized = false;

  isConnected(): boolean {
    if (this.state !== 'connected') {
      return false;
    }
    return this.mode === 'usb' ? true : this.socket != null;
  }

  getStatus(): PrinterStatusSnapshot {
    let target: string | null = null;
    if (this.mode === 'lan' && this.currentIp) {
      target = `${this.currentIp}:${this.currentPort ?? DEFAULT_PRINTER_PORT}`;
    } else if (this.mode === 'usb' && this.currentUsbDevice) {
      target = this.currentUsbDevice.deviceName;
    }

    return {
      state: this.state,
      mode: this.mode,
      target,
      lastError: this.lastError,
      isConnected: this.isConnected(),
    };
  }

  // ---------------------------------------------------------------- LAN ----

  async connectLan(
    ip: string,
    port: number = DEFAULT_PRINTER_PORT,
    timeoutMs: number = DEFAULT_CONNECT_TIMEOUT_MS,
  ): Promise<PrinterActionResult> {
    if (this.connectPromise) {
      return this.connectPromise;
    }
    this.connectPromise = this.performLanConnect(ip, port, timeoutMs).finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }

  /** Backwards-compatible alias for connectLan. */
  async connect(
    ip: string,
    port: number = DEFAULT_PRINTER_PORT,
    timeoutMs: number = DEFAULT_CONNECT_TIMEOUT_MS,
  ): Promise<PrinterActionResult> {
    return this.connectLan(ip, port, timeoutMs);
  }

  // ---------------------------------------------------------------- USB ----

  usbSupported(): boolean {
    return Platform.OS === 'android';
  }

  async listUsbDevices(): Promise<UsbDeviceListResult> {
    if (!this.usbSupported()) {
      return createPrinterError(
        'USB_NOT_SUPPORTED',
        'USB connection is only available on Android devices.',
      );
    }

    const usb = loadUsbPrinterModule();
    if (!usb) {
      return createPrinterError(
        'NATIVE_MODULE_UNAVAILABLE',
        'USB module is unavailable. Use a development build (not Expo Go).',
      );
    }

    try {
      if (!this.usbInitialized) {
        await usb.init();
        this.usbInitialized = true;
      }
      const raw = await usb.getDeviceList();
      const devices: UsbPrinterDevice[] = (raw ?? []).map((d) => ({
        deviceName: d.device_name || 'USB printer',
        vendorId: String(d.vendor_id),
        productId: String(d.product_id),
      }));

      if (devices.length === 0) {
        return createPrinterError(
          'USB_NO_DEVICES',
          'No USB devices found. Plug the printer in via OTG and allow USB access.',
        );
      }

      return { success: true, devices };
    } catch (error) {
      return createPrinterError(
        'USB_CONNECT_FAILED',
        error instanceof Error ? error.message : 'Failed to scan USB devices.',
      );
    }
  }

  async connectUsb(device: UsbPrinterDevice): Promise<PrinterActionResult> {
    if (this.connectPromise) {
      return this.connectPromise;
    }
    this.connectPromise = this.performUsbConnect(device).finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }

  // ------------------------------------------------------------- shared ----

  async disconnect(): Promise<PrinterActionResult> {
    const previousMode = this.mode;

    if (previousMode === 'usb') {
      const usb = loadUsbPrinterModule();
      try {
        await usb?.closeConn();
      } catch {
        // ignore close errors during cleanup
      }
    }

    this.clearSocketListeners();
    try {
      this.socket?.destroy();
    } catch {
      // ignore
    }

    this.socket = null;
    this.state = 'disconnected';
    this.lastError = null;

    return {
      success: true,
      mode: previousMode ?? 'lan',
      target: this.getStatus().target ?? '',
      message: 'Printer disconnected',
    };
  }

  async reconnect(
    timeoutMs: number = DEFAULT_CONNECT_TIMEOUT_MS,
  ): Promise<PrinterActionResult> {
    if (this.mode === 'usb' && this.currentUsbDevice) {
      const device = this.currentUsbDevice;
      await this.disconnect();
      return this.connectUsb(device);
    }

    if (this.mode === 'lan' && this.currentIp && this.currentPort != null) {
      const ip = this.currentIp;
      const port = this.currentPort;
      await this.disconnect();
      return this.connectLan(ip, port, timeoutMs);
    }

    return createPrinterError(
      'NOT_CONNECTED',
      'No previous printer connection to reconnect. Connect first.',
    );
  }

  // ------------------------------------------------------------ private ----

  private async performUsbConnect(
    device: UsbPrinterDevice,
  ): Promise<PrinterActionResult> {
    if (!this.usbSupported()) {
      const error = createPrinterError(
        'USB_NOT_SUPPORTED',
        'USB connection is only available on Android devices.',
      );
      this.lastError = error;
      this.state = 'error';
      return error;
    }

    const usb = loadUsbPrinterModule();
    if (!usb) {
      const error = createPrinterError(
        'NATIVE_MODULE_UNAVAILABLE',
        'USB module is unavailable. Use a development build (not Expo Go).',
      );
      this.lastError = error;
      this.state = 'error';
      return error;
    }

    if (this.socket || this.state === 'connected') {
      await this.disconnect();
    }

    this.state = 'connecting';
    this.mode = 'usb';
    this.currentUsbDevice = device;
    this.lastError = null;

    try {
      if (!this.usbInitialized) {
        await usb.init();
        this.usbInitialized = true;
      }
      await usb.connectPrinter(device.vendorId, device.productId);

      this.state = 'connected';
      void savePrinterConfig({ mode: 'usb', device }).catch(() => {});

      const success: PrinterConnectResult = {
        success: true,
        mode: 'usb',
        target: device.deviceName,
        message: `Connected to ${device.deviceName} via USB`,
      };
      return success;
    } catch (error) {
      const result = createPrinterError(
        'USB_CONNECT_FAILED',
        error instanceof Error
          ? error.message
          : `Could not connect to ${device.deviceName}. Check the cable and USB permission.`,
      );
      this.lastError = result;
      this.state = 'error';
      return result;
    }
  }

  private async performLanConnect(
    ipInput: string,
    portInput: number,
    timeoutMs: number,
  ): Promise<PrinterActionResult> {
    const ip = ipInput.trim();
    const port = parsePrinterPort(portInput);

    if (!isValidIpv4(ip)) {
      const error = createPrinterError(
        'INVALID_IP',
        'Enter a valid IPv4 address (example: 192.168.1.100).',
      );
      this.lastError = error;
      this.state = 'error';
      return error;
    }

    if (port == null) {
      const error = createPrinterError(
        'INVALID_PORT',
        'Enter a valid port between 1 and 65535 (default is 9100).',
      );
      this.lastError = error;
      this.state = 'error';
      return error;
    }

    if (
      this.isConnected() &&
      this.mode === 'lan' &&
      this.currentIp === ip &&
      this.currentPort === port
    ) {
      return {
        success: true,
        mode: 'lan',
        target: `${ip}:${port}`,
        message: 'Already connected to this printer',
      };
    }

    const networkOk = await this.isNetworkAvailable();
    if (!networkOk) {
      const error = createPrinterError(
        'NETWORK_DISCONNECTED',
        'Device network is offline. Connect to the same Wi‑Fi/LAN as the printer.',
      );
      this.lastError = error;
      this.state = 'error';
      return error;
    }

    const TcpSocket = loadTcpSocketModule();
    if (!TcpSocket) {
      const error = createPrinterError(
        'NATIVE_MODULE_UNAVAILABLE',
        'TCP module is unavailable. Use a development build (not Expo Go).',
      );
      this.lastError = error;
      this.state = 'error';
      return error;
    }

    if (this.socket || this.state === 'connected') {
      await this.disconnect();
    }

    this.state = 'connecting';
    this.mode = 'lan';
    this.currentIp = ip;
    this.currentPort = port;
    this.lastError = null;

    return new Promise<PrinterActionResult>((resolve) => {
      let settled = false;

      const settle = (result: PrinterActionResult) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);

        if (!result.success) {
          this.lastError = result;
          this.state = 'error';
          this.clearSocketListeners();
          try {
            this.socket?.destroy();
          } catch {
            // ignore
          }
          this.socket = null;
        }

        resolve(result);
      };

      const timeoutId = setTimeout(() => {
        settle(
          createPrinterError(
            'CONNECTION_TIMEOUT',
            `Could not reach printer at ${ip}:${port} within ${Math.round(timeoutMs / 1000)}s. Check IP, port, and that the printer is online.`,
          ),
        );
      }, timeoutMs);

      try {
        const socket = TcpSocket.createConnection(
          { host: ip, port, reuseAddress: true },
          () => {
            this.socket = socket;
            this.state = 'connected';
            this.lastError = null;

            void savePrinterConfig({ mode: 'lan', ip, port }).catch(() => {});

            settle({
              success: true,
              mode: 'lan',
              target: `${ip}:${port}`,
              message: `Connected to printer at ${ip}:${port}`,
            });
          },
        );

        this.socket = socket;

        socket.on('error', (err: Error) => {
          const message = err?.message?.toLowerCase?.() ?? '';
          const offlineLike =
            message.includes('econnrefused') ||
            message.includes('enotfound') ||
            message.includes('ehostunreach') ||
            message.includes('enetunreach') ||
            message.includes('econnreset');

          settle(
            createPrinterError(
              offlineLike ? 'PRINTER_OFFLINE' : 'SOCKET_ERROR',
              offlineLike
                ? `Printer appears offline or unreachable at ${ip}:${port}.`
                : err?.message || 'Unexpected socket error while connecting.',
            ),
          );
        });

        socket.on('close', () => {
          if (settled && this.state === 'connected') {
            this.state = 'disconnected';
            this.socket = null;
            return;
          }
          if (!settled) {
            settle(
              createPrinterError(
                'PRINTER_OFFLINE',
                `Connection closed before printer at ${ip}:${port} became ready.`,
              ),
            );
          }
        });
      } catch (error) {
        settle(
          createPrinterError(
            'SOCKET_ERROR',
            error instanceof Error
              ? error.message
              : 'Failed to open TCP socket to the printer.',
          ),
        );
      }
    });
  }

  private async isNetworkAvailable(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      if (state.isConnected === false) {
        return false;
      }
      if (state.isInternetReachable === false) {
        // LAN printers often work without internet; only block hard disconnects.
        return state.isConnected !== false;
      }
      return true;
    } catch {
      // If network APIs fail, still attempt TCP connect.
      return true;
    }
  }

  private clearSocketListeners(): void {
    if (!this.socket) {
      return;
    }
    try {
      this.socket.removeAllListeners('error');
      this.socket.removeAllListeners('close');
      this.socket.removeAllListeners('data');
      this.socket.removeAllListeners('connect');
    } catch {
      // ignore
    }
  }
}

/** App-wide singleton — reuse from POS / settings without recreating sockets. */
export const printerService = new PrinterService();
