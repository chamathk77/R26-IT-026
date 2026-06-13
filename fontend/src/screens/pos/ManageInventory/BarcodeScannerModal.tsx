import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarcodeType, CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import { fonts } from '../../../constants/fonts';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
  paperTheme: MD3Theme;
};

/** All retail barcode formats — omitting types can cause missed reads on some labels. */
const ALL_BARCODE_TYPES: BarcodeType[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'codabar',
  'itf14',
  'pdf417',
  'aztec',
  'datamatrix',
  'qr',
];

function normalizeScannedBarcode(raw: string): string {
  return raw.replace(/\s+/g, '').trim();
}

function getFallbackTopInset(): number {
  if (Platform.OS === 'android') {
    return StatusBar.currentHeight ?? 0;
  }
  return 0;
}

type ScannerContentProps = {
  onClose: () => void;
  onScanned: (code: string) => void;
  paperTheme: MD3Theme;
};

function BarcodeScannerContent({ onClose, onScanned, paperTheme }: ScannerContentProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, getFallbackTopInset());
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 16);

  const [permission, requestPermission] = useCameraPermissions();
  const [scanLocked, setScanLocked] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const scanLockRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  useEffect(() => {
    scanLockRef.current = false;
    setScanLocked(false);
    setTorchEnabled(false);
    lastScanRef.current = null;
  }, []);

  useEffect(() => {
    if (permission?.granted) return;
    void requestPermission();
  }, [permission?.granted, requestPermission]);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanLockRef.current) return;
      const code = normalizeScannedBarcode(data);
      if (!code) return;

      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.code === code && now - last.at < 1500) {
        return;
      }
      lastScanRef.current = { code, at: now };

      scanLockRef.current = true;
      setScanLocked(true);
      onScanned(code);
      onClose();
    },
    [onClose, onScanned],
  );

  const handleRequestPermission = useCallback(() => {
    void requestPermission();
  }, [requestPermission]);

  if (permission?.granted) {
    return (
      <View style={styles.root}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torchEnabled}
          onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ALL_BARCODE_TYPES,
          }}
        />

        <View style={styles.overlay} pointerEvents="box-none">
          <View style={[styles.header, { paddingTop: topInset + 8 }]} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onClose}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close scanner"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan barcode</Text>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setTorchEnabled((prev) => !prev)}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={torchEnabled ? 'Turn flashlight off' : 'Turn flashlight on'}
            >
              <Ionicons
                name={torchEnabled ? 'flashlight' : 'flashlight-outline'}
                size={22}
                color={torchEnabled ? paperTheme.colors.primary : '#fff'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.centerBlock} pointerEvents="none">
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <Text style={styles.hint}>Hold the barcode flat and horizontal inside the frame</Text>
            <Text style={styles.subHint}>
              Move closer slowly, avoid glare, and keep the phone steady until it reads
            </Text>
          </View>

          <View
            style={[
              styles.footer,
              {
                backgroundColor: 'rgba(0,0,0,0.55)',
                marginBottom: bottomInset + 8,
              },
            ]}
            pointerEvents="none"
          >
            <Ionicons name="information-circle-outline" size={20} color="#fff" />
            <Text style={styles.footerText}>
              EAN-13 and UPC-A labels on curved or shiny packaging may need extra light or a
              different angle. Tap the flashlight if the label reflects light.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.permissionRoot, { backgroundColor: paperTheme.colors.background }]}>
      <TouchableOpacity
        style={[styles.permissionClose, { top: topInset + 8 }]}
        onPress={onClose}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="close" size={24} color={paperTheme.colors.onBackground} />
      </TouchableOpacity>

      <View style={[styles.permissionBody, { paddingBottom: bottomInset + 24 }]}>
        <Ionicons name="camera-outline" size={48} color={paperTheme.colors.primary} />
        <Text style={[styles.permissionTitle, { color: paperTheme.colors.onBackground }]}>
          Camera access needed
        </Text>
        <Text style={[styles.permissionMessage, { color: paperTheme.colors.onSurfaceVariant }]}>
          Allow camera access to scan product barcodes.
        </Text>
        {permission?.canAskAgain !== false ? (
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: paperTheme.colors.primary }]}
            onPress={handleRequestPermission}
            activeOpacity={0.9}
          >
            <Text style={[styles.permissionBtnText, { color: paperTheme.colors.onPrimary }]}>
              Allow camera
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.permissionMessage, { color: paperTheme.colors.error }]}>
            Camera permission was denied. Enable it in your device Settings.
          </Text>
        )}
      </View>
    </View>
  );
}

export default function BarcodeScannerModal({ visible, onClose, onScanned, paperTheme }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider style={styles.provider}>
        {visible ? (
          <BarcodeScannerContent onClose={onClose} onScanned={onScanned} paperTheme={paperTheme} />
        ) : null}
      </SafeAreaProvider>
    </Modal>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  provider: {
    flex: 1,
    backgroundColor: '#000',
  },
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 2,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 17,
    color: '#fff',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  viewfinder: {
    width: '92%',
    maxWidth: 340,
    height: 130,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#fff',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  hint: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  subHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 2,
  },
  footerText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    color: '#fff',
    lineHeight: 17,
  },
  permissionRoot: {
    flex: 1,
  },
  permissionClose: {
    position: 'absolute',
    left: 20,
    zIndex: 2,
    padding: 8,
  },
  permissionBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  permissionTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  permissionMessage: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  permissionBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
});
