import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { fonts } from '../../../../constants/fonts';
import { useTheme } from '../../../../context/ThemeContext';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import { cardShadow } from '../../shared/settingsDetailStyles';
import {
  DEFAULT_PRINTER_PORT,
  getPrinterService,
  getSavedPrinterConfig,
  type PrinterConnectionMode,
  type PrinterConnectionState,
  type PrinterRole,
  type UsbPrinterDevice,
} from '../../../../services/printer';

type Props = NativeStackScreenProps<RootStackParamList, 'PrinterConnection'>;

const PRINTER_ROLE_META: Record<
  PrinterRole,
  { title: string; headerSubtitle: string; lanHint: string }
> = {
  receipt: {
    title: 'Receipt printer',
    headerSubtitle: 'Cashier counter — customer bills',
    lanHint: 'Phone and printer must be on the same Wi‑Fi / LAN.',
  },
  kitchen: {
    title: 'Kitchen printer',
    headerSubtitle: 'Kitchen station — KOT order tickets',
    lanHint: 'Kitchen tablet and printer must be on the same Wi‑Fi / LAN.',
  },
};

const STATUS_META: Record<
  PrinterConnectionState,
  { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  connected: { label: 'Connected', bg: '#dcfce7', text: '#15803d', icon: 'checkmark-circle' },
  connecting: { label: 'Connecting…', bg: '#e0f2fe', text: '#0369a1', icon: 'sync' },
  error: { label: 'Not connected', bg: '#fee2e2', text: '#b91c1c', icon: 'alert-circle' },
  disconnected: { label: 'Disconnected', bg: '#f1f5f9', text: '#64748b', icon: 'ellipse-outline' },
};

export default function PrinterConnectionScreen({ navigation, route }: Props) {
  const printerRole: PrinterRole = route.params?.printerRole ?? 'receipt';
  const roleMeta = PRINTER_ROLE_META[printerRole];
  const printerService = getPrinterService(printerRole);
  const usbAvailable = printerService.usbSupported() && printerRole === 'receipt';

  const { paperTheme, resolvedTheme } = useTheme();
  const [mode, setMode] = useState<PrinterConnectionMode>('lan');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(String(DEFAULT_PRINTER_PORT));
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState(printerService.getStatus());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackIsError, setFeedbackIsError] = useState(false);
  const [usbDevices, setUsbDevices] = useState<UsbPrinterDevice[]>([]);
  const [connectingUsbId, setConnectingUsbId] = useState<string | null>(null);

  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status.state === 'connecting' || scanning || checking) {
      const loop = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
      return () => {
        loop.stop();
        spin.setValue(0);
      };
    }
    return undefined;
  }, [status.state, scanning, checking, spin]);

  const refreshStatus = useCallback(() => {
    setStatus(printerService.getStatus());
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await getSavedPrinterConfig(printerRole);
      if (!mounted) {
        return;
      }
      if (saved?.mode === 'lan') {
        setIp(saved.ip);
        setPort(String(saved.port));
        setMode('lan');
      } else if (saved?.mode === 'usb' && printerRole === 'receipt' && usbAvailable) {
        setMode('usb');
      } else {
        setMode('lan');
      }
      refreshStatus();
    })();
    return () => {
      mounted = false;
    };
  }, [printerRole, refreshStatus, usbAvailable]);

  const setResult = (message: string, isError: boolean) => {
    setFeedback(message);
    setFeedbackIsError(isError);
  };

  const handleLanConnect = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await printerService.connectLan(ip.trim(), Number(port.trim()));
      setResult(result.message, !result.success);
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Connection failed', true);
    } finally {
      refreshStatus();
      setBusy(false);
    }
  };

  const handleScanUsb = async () => {
    setScanning(true);
    setFeedback(null);
    setUsbDevices([]);
    try {
      const result = await printerService.listUsbDevices();
      if (result.success) {
        setUsbDevices(result.devices);
        setResult(
          `${result.devices.length} device${result.devices.length === 1 ? '' : 's'} found`,
          false,
        );
      } else {
        setResult(result.message, true);
      }
    } finally {
      setScanning(false);
    }
  };

  const handleUsbConnect = async (device: UsbPrinterDevice) => {
    setBusy(true);
    setConnectingUsbId(`${device.vendorId}:${device.productId}`);
    setFeedback(null);
    try {
      const result = await printerService.connectUsb(device);
      setResult(result.message, !result.success);
    } finally {
      refreshStatus();
      setBusy(false);
      setConnectingUsbId(null);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      const result = await printerService.disconnect();
      setResult(result.message, !result.success);
    } finally {
      refreshStatus();
      setBusy(false);
    }
  };

  const handleReconnect = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await printerService.reconnect();
      setResult(result.message, !result.success);
    } finally {
      refreshStatus();
      setBusy(false);
    }
  };

  const handleCheckConnection = async () => {
    setChecking(true);
    setFeedback(null);
    try {
      const result = await printerService.checkConnection();
      setResult(result.message, !result.success);
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Printer check failed', true);
    } finally {
      refreshStatus();
      setChecking(false);
    }
  };

  const isBusy = busy || checking;

  const meta = STATUS_META[status.state];
  const primary = paperTheme.colors.primary;
  const surface = paperTheme.colors.surface;
  const isDark = resolvedTheme === 'dark';

  const spinStyle = {
    transform: [
      {
        rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
      },
    ],
  };

  const heroIcon: keyof typeof Ionicons.glyphMap =
    status.state === 'connected' ? 'print' : 'print-outline';

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title={roleMeta.title}
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ---- Status hero ---- */}
            <View
              style={[
                styles.hero,
                {
                  backgroundColor: surface,
                  borderColor: paperTheme.colors.outlineVariant,
                },
                cardShadow(resolvedTheme),
              ]}
            >
              <View
                style={[
                  styles.heroIconRing,
                  {
                    backgroundColor:
                      status.state === 'connected'
                        ? '#dcfce7'
                        : paperTheme.colors.primaryContainer,
                  },
                ]}
              >
                <Ionicons
                  name={heroIcon}
                  size={34}
                  color={status.state === 'connected' ? '#15803d' : primary}
                />
              </View>

              <View style={styles.heroText}>
                <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                  {status.state === 'connecting' ? (
                    <Animated.View style={spinStyle}>
                      <Ionicons name="sync" size={14} color={meta.text} />
                    </Animated.View>
                  ) : (
                    <Ionicons name={meta.icon} size={14} color={meta.text} />
                  )}
                  <Text style={[styles.statusPillText, { color: meta.text }]}>
                    {meta.label}
                  </Text>
                </View>

                <Text
                  style={[styles.heroTarget, { color: paperTheme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {status.target ?? 'No printer linked yet'}
                </Text>
                <Text
                  style={[styles.heroMode, { color: paperTheme.colors.onSurfaceVariant }]}
                >
                  {roleMeta.headerSubtitle}
                  {status.mode
                    ? ` · ${status.mode === 'lan' ? 'Network (LAN)' : 'USB cable'}`
                    : ''}
                </Text>
              </View>
            </View>

            {/* ---- Mode switch ---- */}
            {usbAvailable ? (
              <View
                style={[
                  styles.segment,
                  {
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                  },
                ]}
              >
                {(
                  [
                    { key: 'lan', label: 'Network', icon: 'wifi-outline' },
                    { key: 'usb', label: 'USB', icon: 'hardware-chip-outline' },
                  ] as const
                ).map((item) => {
                  const active = mode === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.segmentBtn,
                        active && [
                          styles.segmentBtnActive,
                          { backgroundColor: surface },
                          cardShadow(resolvedTheme),
                        ],
                      ]}
                      onPress={() => {
                        setMode(item.key);
                        setFeedback(null);
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={item.icon}
                        size={17}
                        color={active ? primary : paperTheme.colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.segmentText,
                          {
                            color: active
                              ? paperTheme.colors.onSurface
                              : paperTheme.colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {/* ---- LAN form ---- */}
            {mode === 'lan' || !usbAvailable ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                  Network connection
                </Text>
                <Text
                  style={[styles.cardSub, { color: paperTheme.colors.onSurfaceVariant }]}
                >
                  {roleMeta.lanHint}
                </Text>

                <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
                  IP address
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor: paperTheme.colors.outline,
                      backgroundColor: paperTheme.colors.background,
                    },
                  ]}
                >
                  <Ionicons
                    name="globe-outline"
                    size={18}
                    color={paperTheme.colors.onSurfaceVariant}
                  />
                  <TextInput
                    value={ip}
                    onChangeText={setIp}
                    placeholder="192.168.1.100"
                    placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                    keyboardType="numeric"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isBusy}
                    style={[styles.input, { color: paperTheme.colors.onSurface }]}
                  />
                </View>

                <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Port
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor: paperTheme.colors.outline,
                      backgroundColor: paperTheme.colors.background,
                    },
                  ]}
                >
                  <Ionicons
                    name="git-network-outline"
                    size={18}
                    color={paperTheme.colors.onSurfaceVariant}
                  />
                  <TextInput
                    value={port}
                    onChangeText={setPort}
                    placeholder={String(DEFAULT_PRINTER_PORT)}
                    placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                    keyboardType="number-pad"
                    editable={!isBusy}
                    style={[styles.input, { color: paperTheme.colors.onSurface }]}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: primary, opacity: isBusy ? 0.7 : 1 },
                  ]}
                  onPress={handleLanConnect}
                  disabled={isBusy}
                  activeOpacity={0.85}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="flash-outline" size={19} color="#fff" />
                      <Text style={styles.primaryBtnText}>Connect</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* ---- USB panel ---- */
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                  USB connection
                </Text>
                <Text
                  style={[styles.cardSub, { color: paperTheme.colors.onSurfaceVariant }]}
                >
                  Plug the printer into this device with an OTG cable, then scan.
                  Android only.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.scanBtn,
                    {
                      borderColor: primary,
                      opacity: scanning || isBusy ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleScanUsb}
                  disabled={scanning || isBusy}
                  activeOpacity={0.85}
                >
                  {scanning ? (
                    <Animated.View style={spinStyle}>
                      <Ionicons name="sync" size={19} color={primary} />
                    </Animated.View>
                  ) : (
                    <Ionicons name="search-outline" size={19} color={primary} />
                  )}
                  <Text style={[styles.scanBtnText, { color: primary }]}>
                    {scanning ? 'Scanning…' : 'Scan for devices'}
                  </Text>
                </TouchableOpacity>

                {usbDevices.map((device) => {
                  const id = `${device.vendorId}:${device.productId}`;
                  const isThis = connectingUsbId === id;
                  const isCurrent =
                    status.mode === 'usb' &&
                    status.isConnected &&
                    status.target === device.deviceName;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.deviceRow,
                        {
                          borderColor: isCurrent
                            ? '#15803d'
                            : paperTheme.colors.outlineVariant,
                          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                        },
                      ]}
                      onPress={() => handleUsbConnect(device)}
                      disabled={isBusy}
                      activeOpacity={0.85}
                    >
                      <View
                        style={[
                          styles.deviceIcon,
                          { backgroundColor: paperTheme.colors.primaryContainer },
                        ]}
                      >
                        <Ionicons name="print-outline" size={20} color={primary} />
                      </View>
                      <View style={styles.deviceText}>
                        <Text
                          style={[styles.deviceName, { color: paperTheme.colors.onSurface }]}
                          numberOfLines={1}
                        >
                          {device.deviceName}
                        </Text>
                        <Text
                          style={[
                            styles.deviceMeta,
                            { color: paperTheme.colors.onSurfaceVariant },
                          ]}
                        >
                          VID {device.vendorId} · PID {device.productId}
                        </Text>
                      </View>
                      {isThis ? (
                        <ActivityIndicator size="small" color={primary} />
                      ) : isCurrent ? (
                        <Ionicons name="checkmark-circle" size={22} color="#15803d" />
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={paperTheme.colors.onSurfaceVariant}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ---- Feedback ---- */}
            {feedback ? (
              <View
                style={[
                  styles.feedbackCard,
                  {
                    backgroundColor: feedbackIsError
                      ? isDark
                        ? '#450a0a'
                        : '#fef2f2'
                      : isDark
                        ? '#052e16'
                        : '#f0fdf4',
                    borderColor: feedbackIsError ? '#fca5a5' : '#86efac',
                  },
                ]}
              >
                <Ionicons
                  name={feedbackIsError ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                  size={18}
                  color={feedbackIsError ? '#dc2626' : '#16a34a'}
                />
                <Text
                  style={[
                    styles.feedbackText,
                    { color: feedbackIsError ? (isDark ? '#fecaca' : '#991b1b') : isDark ? '#bbf7d0' : '#166534' },
                  ]}
                >
                  {feedback}
                </Text>
              </View>
            ) : null}

            {status.isConnected ? (
              <TouchableOpacity
                style={[
                  styles.checkBtn,
                  {
                    backgroundColor: isDark ? '#052e16' : '#ecfdf5',
                    borderColor: '#86efac',
                    opacity: isBusy ? 0.7 : 1,
                  },
                ]}
                onPress={handleCheckConnection}
                disabled={isBusy}
                activeOpacity={0.85}
              >
                {checking ? (
                  <ActivityIndicator color="#15803d" />
                ) : (
                  <Ionicons name="print-outline" size={19} color="#15803d" />
                )}
                <View style={styles.checkBtnTextWrap}>
                  <Text style={styles.checkBtnTitle}>Check connection</Text>
                  <Text
                    style={[
                      styles.checkBtnSub,
                      { color: paperTheme.colors.onSurfaceVariant },
                    ]}
                  >
                    Sends a short test receipt to confirm printing works
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* ---- Session actions ---- */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    borderColor: paperTheme.colors.outline,
                    backgroundColor: surface,
                  },
                ]}
                onPress={handleReconnect}
                disabled={isBusy}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh-outline" size={18} color={paperTheme.colors.onSurface} />
                <Text style={[styles.actionText, { color: paperTheme.colors.onSurface }]}>
                  Reconnect
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    borderColor: '#fecaca',
                    backgroundColor: isDark ? '#450a0a' : '#fef2f2',
                  },
                ]}
                onPress={handleDisconnect}
                disabled={isBusy}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
                <Text style={[styles.actionText, { color: '#dc2626' }]}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  heroIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, gap: 4 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  heroTarget: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  heroMode: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },

  segment: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 11,
    paddingVertical: 10,
  },
  segmentBtnActive: {},
  segmentText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
  },

  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  cardTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  cardSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 4,
  },
  label: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12.5,
    marginTop: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  primaryBtn: {
    marginTop: 8,
    borderRadius: 14,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    color: '#fff',
  },

  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 48,
    borderStyle: 'dashed',
  },
  scanBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceText: { flex: 1 },
  deviceName: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  deviceMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11.5,
  },

  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  feedbackText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },

  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  checkBtnTextWrap: {
    flex: 1,
    gap: 2,
  },
  checkBtnTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    color: '#15803d',
  },
  checkBtnSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 16,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 46,
  },
  actionText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13.5,
  },
});
