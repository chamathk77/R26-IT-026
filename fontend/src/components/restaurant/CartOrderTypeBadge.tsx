import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { CartOrderType } from '../../type/cart';
import { getCartOrderTypeLabel } from '../../utils/cartSession';

type Props = {
  orderType?: CartOrderType | null;
  orderLabel?: string | null;
  compact?: boolean;
  /** When false, dine-in shows without table number (restaurant without table management). */
  showTableManagement?: boolean;
};

export default function CartOrderTypeBadge({
  orderType,
  orderLabel,
  compact = false,
  showTableManagement = false,
}: Props) {
  const { paperTheme } = useTheme();
  const typeLabel = getCartOrderTypeLabel(orderType);

  if (!typeLabel) {
    return null;
  }

  const isDineIn = orderType === 'dine_in';
  const accent = isDineIn ? paperTheme.colors.tertiary : paperTheme.colors.primary;
  const detail =
    showTableManagement &&
    isDineIn &&
    orderLabel &&
    orderLabel.trim() &&
    orderLabel.trim() !== typeLabel
      ? orderLabel.trim()
      : null;

  return (
    <View
      style={[
        styles.badge,
        compact ? styles.badgeCompact : null,
        { backgroundColor: `${accent}18` },
      ]}
    >
      <Ionicons
        name={isDineIn ? 'restaurant-outline' : 'bag-handle-outline'}
        size={compact ? 11 : 12}
        color={accent}
      />
      <Text style={[styles.typeText, compact ? styles.typeTextCompact : null, { color: accent }]}>
        {typeLabel}
      </Text>
      {detail ? (
        <Text style={[styles.detailText, compact ? styles.detailTextCompact : null, { color: accent }]}>
          · {detail}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  typeTextCompact: {
    fontSize: 11,
  },
  detailText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  detailTextCompact: {
    fontSize: 11,
  },
});
