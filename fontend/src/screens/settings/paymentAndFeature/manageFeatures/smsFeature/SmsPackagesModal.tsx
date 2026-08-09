import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../../../../constants/fonts';
import type { SmsPackage } from '../../../../../type/shopOnboarding';
import { formatSmsPackageLabel } from '../../../../../type/shopOnboarding';
import { formatLkr } from '../../../../../type/onboarding';

type Props = {
  visible: boolean;
  loading: boolean;
  packages: SmsPackage[];
  selectedType: string | null;
  onClose: () => void;
  paperTheme: ReturnType<typeof import('../../../../../context/ThemeContext').useTheme>['paperTheme'];
};

const SHEET_MAX_HEIGHT_RATIO = 0.88;
const SHEET_HEADER_HEIGHT = 118;

export default function SmsPackagesModal({
  visible,
  loading,
  packages,
  selectedType,
  onClose,
  paperTheme,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12);
  const scrollMaxHeight = useMemo(() => {
    const windowHeight = Dimensions.get('window').height;
    return Math.max(
      220,
      windowHeight * SHEET_MAX_HEIGHT_RATIO - SHEET_HEADER_HEIGHT - bottomInset,
    );
  }, [bottomInset]);

  const renderPackageCard = (pkg: SmsPackage) => {
    const isCurrent = selectedType === pkg.type;
    const cardStyle = [
      styles.packageCard,
      {
        borderColor: isCurrent ? paperTheme.colors.primary : paperTheme.colors.outlineVariant,
        backgroundColor: isCurrent
          ? paperTheme.colors.primaryContainer
          : paperTheme.colors.surfaceVariant,
      },
    ];

    return (
      <View key={pkg.type} style={cardStyle}>
        <View style={styles.packageTop}>
          <Text style={[styles.packageTitle, { color: paperTheme.colors.onSurface }]}>
            {formatSmsPackageLabel(pkg)}
          </Text>
          {isCurrent ? (
            <View style={[styles.currentBadge, { backgroundColor: paperTheme.colors.primary }]}>
              <Text style={[styles.currentBadgeText, { color: paperTheme.colors.onPrimary }]}>
                Current
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.packageFee, { color: paperTheme.colors.primary }]}>
          {formatLkr(pkg.fee)} / month
        </Text>
        <Text style={[styles.packageMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
          Package: {pkg.type}
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: paperTheme.colors.surface,
              paddingBottom: bottomInset,
              maxHeight: `${SHEET_MAX_HEIGHT_RATIO * 100}%`,
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: paperTheme.colors.onSurface }]}>
                SMS package prices
              </Text>
              <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
                Monthly SMS tiers based on message volume. Your current package is selected
                automatically from usage.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={paperTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: scrollMaxHeight }}
              contentContainerStyle={[
                styles.list,
                { paddingBottom: bottomInset + 20 },
              ]}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              bounces
              keyboardShouldPersistTaps="handled"
            >
              {packages.map(renderPackageCard)}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.8)',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 20,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingTop: 4,
    gap: 10,
  },
  packageCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  packageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  packageTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    flex: 1,
  },
  currentBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  packageFee: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    marginBottom: 4,
  },
  packageMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
});
