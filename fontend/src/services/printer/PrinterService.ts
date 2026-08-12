import { NativeModules, Platform } from 'react-native';
import * as Network from 'expo-network';
import {
  DEFAULT_CONNECT_TIMEOUT_MS,
  DEFAULT_PRINTER_PORT,
  type PrinterActionResult,
  type PrinterConnectionMode,
  type PrinterConnectionState,
  type PrinterConnectResult,
  type PrinterErrorResult,
  type PrinterRole,
  type PrinterStatusSnapshot,
  type UsbDeviceListResult,
  type UsbPrinterDevice,
} from './printerTypes';
import { createPrinterError, isValidIpv4, parsePrinterPort } from './printerValidation';
import { getSavedPrinterConfig, savePrinterConfig } from './printerStorage';

type TcpSocketLike = {
  on: (event: string, listener: (...args: any[]) => void) => void;
  removeAllListeners: (event?: string) => void;
  destroy: () => void;
  write?: (
    data: string | Buffer,
    encoding?: BufferEncoding | (() => void),
    callback?: (error?: Error | null) => void,
  ) => boolean;
  end?: (data?: string | Buffer, encoding?: BufferEncoding) => void;
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
  printText?: (text: string) => Promise<void>;
};

type NetPrinterModule = {
  init: () => Promise<void>;
  connectPrinter: (host: string, port: number | string) => Promise<unknown>;
  closeConn: () => Promise<void>;
  printBill: (text: string, opts?: object) => void;
};

type LanBackend = 'tcp-socket' | 'net-printer';

const LAN_PRINT_DRAIN_MS = 800;
const LAN_PRINT_RETRY_DELAY_MS = 1500;

const DEV_BUILD_MESSAGE =
  'LAN printing requires a development build (not Expo Go). Run: npx expo run:android';

function buildEscPosPayload(content: string): string {
  const ESC = '\x1b';
  const GS = '\x1d';
  // The cutter sits above the print head, so the last lines must be fed past
  // it (ESC d n) before cutting, otherwise the cut lands on printed text.
  const feedPastCutter = `${ESC}d\x06`;
  return `${ESC}@${content}\n${feedPastCutter}${GS}V\x42\x00`;
}
function buildTestPrintPayload(role: PrinterRole): string {
  const ESC = '\x1b';
  const label = role === 'kitchen' ? 'Kitchen printer' : 'Receipt printer';
  const timestamp = new Date().toLocaleString();

  return buildEscPosPayload(
    `${ESC}a\x01` +
      '*** TEST PRINT ***\n' +
      `${ESC}a\x00` +
      'SmartCost POS\n' +
      `${label}\n` +
      'Connection OK\n' +
      `${timestamp}`,
  );
}

function isTcpNativeAvailable(): boolean {
  return NativeModules.TcpSockets != null;
}

function isNetPrinterNativeAvailable(): boolean {
  return NativeModules.RNNetPrinter != null;
}

function loadTcpSocketModule(): TcpSocketModule | null {
  if (!isTcpNativeAvailable()) {
    return null;
  }

  try {
    // Native TCP sockets require a custom/dev client build (not Expo Go).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-tcp-socket') as TcpSocketModule;
  } catch {
    return null;
  }
}

function loadNetPrinterModule(): NetPrinterModule | null {
  if (!isNetPrinterNativeAvailable()) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-thermal-receipt-printer') as {
      NetPrinter?: NetPrinterModule;
    };
    return mod.NetPrinter ?? null;
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
  private readonly role: PrinterRole;

  private socket: TcpSocketLike | null = null;
  private lanBackend: LanBackend | null = null;
  private state: PrinterConnectionState = 'disconnected';
  private mode: PrinterConnectionMode | null = null;
  private currentIp: string | null = null;
  private currentPort: number | null = null;
  private currentUsbDevice: UsbPrinterDevice | null = null;
  private lastError: PrinterErrorResult | null = null;
  private connectPromise: Promise<PrinterActionResult> | null = null;
  private usbInitialized = false;
  private netPrinterInitialized = false;

  constructor(role: PrinterRole) {
    this.role = role;
  }

  getRole(): PrinterRole {
    return this.role;
  }

  isConnected(): boolean {
    if (this.state !== 'connected') {
      return false;
    }
    if (this.mode === 'usb') {
      return true;
    }
    if (this.mode === 'lan') {
      // LAN printers often close TCP after each job — configured target counts as connected.
      return this.currentIp != null;
    }
    return false;
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

    if (this.lanBackend === 'net-printer') {
      const net = loadNetPrinterModule();
      try {
        await net?.closeConn();
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
    this.lanBackend = null;
    this.state = 'disconnected';
    this.lastError = null;

    return {
      success: true,
      mode: previousMode ?? 'lan',
      target: this.getStatus().target ?? '',
      message: 'Printer disconnected',
    };
  }

  async checkConnection(): Promise<PrinterActionResult> {
    if (!this.isConnected()) {
      return createPrinterError(
        'NOT_CONNECTED',
        'Connect to a printer first, then check the connection.',
      );
    }

    if (this.mode === 'lan') {
      const label = this.role === 'kitchen' ? 'Kitchen printer' : 'Receipt printer';
      return this.sendLanPrint(
        `*** TEST PRINT ***\nSmartCost POS\n${label}\nConnection OK\n${new Date().toLocaleString()}`,
        {
          successMessage: `Printer check passed. Test receipt sent to ${this.getStatus().target ?? 'printer'}.`,
        },
      );
    }

    if (this.mode === 'usb') {
      return this.sendUsbPrint(buildTestPrintPayload(this.role), {
        successMessage: `Printer check passed. Test receipt sent to ${this.getStatus().target ?? 'USB printer'}.`,
      });
    }

    return createPrinterError('NOT_CONNECTED', 'No active printer connection.');
  }

  async printReceipt(content: string): Promise<PrinterActionResult> {
    const trimmed = content.trim();
    if (!trimmed) {
      return createPrinterError('UNKNOWN', 'Nothing to print.');
    }

    const connectResult = await this.ensureConnectedFromSaved();
    if (!connectResult.success) {
      return connectResult;
    }

    const target = this.getStatus().target ?? 'printer';

    if (this.mode === 'lan') {
      return this.sendLanPrint(trimmed, {
        successMessage: `Receipt sent to ${target}.`,
      });
    }

    if (this.mode === 'usb') {
      return this.sendUsbPrint(buildEscPosPayload(trimmed), {
        successMessage: `Receipt sent to ${target}.`,
      });
    }

    return createPrinterError('NOT_CONNECTED', 'No active printer connection.');
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

  private async ensureConnectedFromSaved(): Promise<PrinterActionResult> {
    if (this.isConnected()) {
      const target = this.getStatus().target ?? '';
      return {
        success: true,
        mode: this.mode ?? 'lan',
        target,
        message: target ? `Connected to ${target}` : 'Printer connected',
      };
    }

    const saved = await getSavedPrinterConfig(this.role);
    if (!saved) {
      return createPrinterError(
        'NOT_CONNECTED',
        'No receipt printer configured. Set one up in Settings → Receipt printer.',
      );
    }

    if (saved.mode === 'lan') {
      return this.connectLan(saved.ip, saved.port);
    }

    return this.connectUsb(saved.device);
  }

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
      void savePrinterConfig(this.role, { mode: 'usb', device }).catch(() => {});

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
      this.state === 'connected' &&
      this.mode === 'lan' &&
      this.currentIp === ip &&
      this.currentPort === port &&
      this.lanBackend === 'tcp-socket' &&
      this.socket?.write
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

    if (isTcpNativeAvailable()) {
      return this.performLanConnectTcpSocket(ip, port, timeoutMs);
    }

    if (isNetPrinterNativeAvailable()) {
      return this.performLanConnectNetPrinter(ip, port, timeoutMs);
    }

    const error = createPrinterError('NATIVE_MODULE_UNAVAILABLE', DEV_BUILD_MESSAGE);
    this.lastError = error;
    this.state = 'error';
    return error;
  }

  private async performLanConnectNetPrinter(
    ip: string,
    port: number,
    timeoutMs: number,
  ): Promise<PrinterActionResult> {
    const net = loadNetPrinterModule();
    if (!net) {
      const error = createPrinterError('NATIVE_MODULE_UNAVAILABLE', DEV_BUILD_MESSAGE);
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
    this.lanBackend = 'net-printer';

    try {
      if (!this.netPrinterInitialized) {
        await net.init();
        this.netPrinterInitialized = true;
      }

      await Promise.race([
        net.connectPrinter(ip, port),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                `Could not reach printer at ${ip}:${port} within ${Math.round(timeoutMs / 1000)}s.`,
              ),
            );
          }, timeoutMs);
        }),
      ]);

      this.state = 'connected';
      void savePrinterConfig(this.role, { mode: 'lan', ip, port }).catch(() => {});

      return {
        success: true,
        mode: 'lan',
        target: `${ip}:${port}`,
        message: `Connected to printer at ${ip}:${port}`,
      };
    } catch (error) {
      this.lanBackend = null;
      const result = createPrinterError(
        'PRINTER_OFFLINE',
        error instanceof Error
          ? error.message
          : `Printer appears offline or unreachable at ${ip}:${port}.`,
      );
      this.lastError = result;
      this.state = 'error';
      return result;
    }
  }

  private closeLanTcpSocket(): void {
    this.clearSocketListeners();
    try {
      this.socket?.destroy();
    } catch {
      // ignore
    }
    this.socket = null;
  }

  /**
   * Wi-Fi receipt printers accept a single TCP client, so a socket is never
   * held open while idle: closing with FIN lets the printer free the slot.
   */
  private releaseSocket(socket: TcpSocketLike): void {
    try {
      socket.removeAllListeners('error');
      socket.removeAllListeners('close');
      socket.removeAllListeners('data');
      socket.removeAllListeners('connect');
    } catch {
      // ignore
    }

    try {
      socket.end?.();
    } catch {
      // ignore
    }

    setTimeout(() => {
      try {
        socket.destroy();
      } catch {
        // ignore
      }
    }, 300);

    if (this.socket === socket) {
      this.socket = null;
    }
  }

  private async performLanConnectTcpSocket(
    ip: string,
    port: number,
    timeoutMs: number,
  ): Promise<PrinterActionResult> {
    const TcpSocket = loadTcpSocketModule();
    if (!TcpSocket) {
      const error = createPrinterError('NATIVE_MODULE_UNAVAILABLE', DEV_BUILD_MESSAGE);
      this.lastError = error;
      this.state = 'error';
      return error;
    }

    const reopening =
      this.state === 'connected' && this.currentIp === ip && this.currentPort === port;

    if (this.socket) {
      this.closeLanTcpSocket();
    } else if (this.state === 'connected' && !reopening) {
      await this.disconnect();
    }

    if (!reopening) {
      this.state = 'connecting';
    }
    this.mode = 'lan';
    this.currentIp = ip;
    this.currentPort = port;
    this.lastError = null;
    this.lanBackend = 'tcp-socket';

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
          this.lanBackend = null;
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
            this.state = 'connected';
            this.lastError = null;

            void savePrinterConfig(this.role, { mode: 'lan', ip, port }).catch(() => {});

            this.releaseSocket(socket);

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
          if (this.socket === socket) {
            this.socket = null;
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

  private async sendLanPrint(
    content: string,
    options?: { successMessage?: string },
  ): Promise<PrinterActionResult> {
    const target = this.getStatus().target ?? 'printer';

    if (this.lanBackend === 'net-printer') {
      const net = loadNetPrinterModule();
      if (!net) {
        return createPrinterError('NATIVE_MODULE_UNAVAILABLE', DEV_BUILD_MESSAGE);
      }

      try {
        net.printBill(content, { cut: true });
        return {
          success: true,
          mode: 'lan',
          target,
          message: options?.successMessage ?? `Print sent to ${target}.`,
        };
      } catch (error) {
        const result = createPrinterError(
          'SOCKET_ERROR',
          error instanceof Error
            ? error.message
            : `Print failed at ${target}.`,
        );
        this.lastError = result;
        this.state = 'error';
        return result;
      }
    }

    if (!this.currentIp || this.currentPort == null) {
      return createPrinterError(
        'NOT_CONNECTED',
        'Printer connection lost. Tap Connect again.',
      );
    }

    const TcpSocket = loadTcpSocketModule();
    if (!TcpSocket) {
      return createPrinterError('NATIVE_MODULE_UNAVAILABLE', DEV_BUILD_MESSAGE);
    }

    // Nothing should be holding the printer's single connection slot.
    this.closeLanTcpSocket();

    const ip = this.currentIp;
    const port = this.currentPort;
    const payload = buildEscPosPayload(content);

    let failure = await this.attemptLanPrint(TcpSocket, ip, port, payload, target);

    if (failure) {
      // The printer needs a moment to release the slot after a dropped job.
      await new Promise((done) => setTimeout(done, LAN_PRINT_RETRY_DELAY_MS));
      failure = await this.attemptLanPrint(TcpSocket, ip, port, payload, target);
    }

    if (failure) {
      this.lastError = failure;
      this.state = 'error';
      return failure;
    }

    this.state = 'connected';
    this.lastError = null;

    return {
      success: true,
      mode: 'lan',
      target,
      message: options?.successMessage ?? `Print sent to ${target}.`,
    };
  }

  /** Resolves with `null` on success, or the failure that stopped the job. */
  private attemptLanPrint(
    TcpSocket: TcpSocketModule,
    ip: string,
    port: number,
    payload: string,
    target: string,
  ): Promise<PrinterErrorResult | null> {
    return new Promise<PrinterErrorResult | null>((resolve) => {
      let settled = false;
      let writeAcked = false;
      let printSocket: TcpSocketLike | null = null;

      const settle = (failure: PrinterErrorResult | null) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        clearTimeout(drainTimeoutId);

        const socket = printSocket;
        printSocket = null;
        if (socket) {
          this.releaseSocket(socket);
        }

        resolve(failure);
      };

      const timeoutId = setTimeout(() => {
        settle(
          createPrinterError(
            'CONNECTION_TIMEOUT',
            `Printer at ${ip}:${port} did not accept the print job in time.`,
          ),
        );
      }, DEFAULT_CONNECT_TIMEOUT_MS);

      let drainTimeoutId: ReturnType<typeof setTimeout>;

      try {
        const socket = TcpSocket.createConnection({ host: ip, port, reuseAddress: true }, () => {
          try {
            socket.write?.(payload, 'binary', (error) => {
              if (error) {
                settle(
                  createPrinterError(
                    'SOCKET_ERROR',
                    `Print failed at ${target}. ${error.message}`,
                  ),
                );
                return;
              }

              writeAcked = true;

              // Half-close so the printer flushes the job, then stop waiting
              // for its own close in case the firmware never sends one.
              try {
                socket.end?.();
              } catch {
                // ignore
              }
              drainTimeoutId = setTimeout(() => settle(null), LAN_PRINT_DRAIN_MS);
            });
          } catch (error) {
            settle(
              createPrinterError(
                'SOCKET_ERROR',
                error instanceof Error ? error.message : `Print failed at ${target}.`,
              ),
            );
          }
        });

        printSocket = socket;

        socket.on('error', (err: Error) => {
          if (writeAcked) {
            return;
          }
          settle(
            createPrinterError(
              'PRINTER_OFFLINE',
              err?.message || `Printer unreachable at ${ip}:${port}.`,
            ),
          );
        });

        // Printers commonly drop the socket right after accepting a job.
        socket.on('close', () => {
          if (writeAcked) {
            settle(null);
            return;
          }
          settle(
            createPrinterError(
              'PRINTER_OFFLINE',
              `Printer at ${ip}:${port} closed the connection before printing.`,
            ),
          );
        });
      } catch (error) {
        settle(
          createPrinterError(
            'SOCKET_ERROR',
            error instanceof Error
              ? error.message
              : `Print failed at ${target}.`,
          ),
        );
      }
    });
  }

  private async sendUsbPrint(
    content: string,
    options?: { successMessage?: string },
  ): Promise<PrinterActionResult> {
    const target = this.getStatus().target ?? 'USB printer';
    const usb = loadUsbPrinterModule();

    if (!usb?.printText) {
      return createPrinterError(
        'NATIVE_MODULE_UNAVAILABLE',
        'USB printing is unavailable. Use a development build (not Expo Go).',
      );
    }

    try {
      await usb.printText(content);

      return {
        success: true,
        mode: 'usb',
        target,
        message: options?.successMessage ?? `Print sent to ${target}.`,
      };
    } catch (error) {
      const result = createPrinterError(
        'USB_CONNECT_FAILED',
        error instanceof Error
          ? error.message
          : `Print failed for ${target}.`,
      );
      this.lastError = result;
      this.state = 'error';
      return result;
    }
  }
}

const printerServices = new Map<PrinterRole, PrinterService>();

export function getPrinterService(role: PrinterRole = 'receipt'): PrinterService {
  const existing = printerServices.get(role);
  if (existing) {
    return existing;
  }

  const service = new PrinterService(role);
  printerServices.set(role, service);
  return service;
}

/** Cashier / receipt printer (default). */
export const receiptPrinterService = getPrinterService('receipt');

/** Kitchen KOT printer — restaurant + kitchenOrders only. */
export const kitchenPrinterService = getPrinterService('kitchen');

/** @deprecated Use receiptPrinterService or getPrinterService(role). */
export const printerService = receiptPrinterService;
