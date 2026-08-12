import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { CartOrderType } from '../../type/cart';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (orderType: CartOrderType) => void;
  showTableManagement?: boolean;
};

export default function OrderTypeModal({
  visible,
  onClose,
  onSelect,
  showTableManagement = true,
}: Props) {
  const { paperTheme } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: paperTheme.colors.surface }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${paperTheme.colors.primary}14` }]}>
            <Ionicons name="fast-food-outline" size={28} color={paperTheme.colors.primary} />
          </View>

          <Text style={[styles.title, { color: paperTheme.colors.onSurface }]}>Start order</Text>
          <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
            Choose how this order will be served
          </Text>

          <View style={styles.optionsWrap}>
            <TouchableOpacity
              style={[
                styles.optionCard,
                {
                  backgroundColor: paperTheme.colors.primaryContainer,
                  borderColor: `${paperTheme.colors.primary}33`,
                },
              ]}
              onPress={() => onSelect('takeaway')}
              activeOpacity={0.88}
            >
              <View style={[styles.optionIcon, { backgroundColor: paperTheme.colors.surface }]}>
                <Ionicons name="bag-handle-outline" size={22} color={paperTheme.colors.primary} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
                  Takeaway
                </Text>
                <Text style={[styles.optionSub, { color: paperTheme.colors.onPrimaryContainer }]}>
                  Pack and go — no table needed
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={paperTheme.colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                {
                  backgroundColor: paperTheme.colors.secondaryContainer,
                  borderColor: `${paperTheme.colors.secondary}33`,
                },
              ]}
              onPress={() => onSelect('dine_in')}
              activeOpacity={0.88}
            >
              <View style={[styles.optionIcon, { backgroundColor: paperTheme.colors.surface }]}>
                <Ionicons name="restaurant-outline" size={22} color={paperTheme.colors.secondary} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, { color: paperTheme.colors.onSecondaryContainer }]}>
                  Dine-in
                </Text>
                <Text style={[styles.optionSub, { color: paperTheme.colors.onSecondaryContainer }]}>
                  {showTableManagement
                    ? 'Pick a free table for this order'
                    : 'Serve at the restaurant floor'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={paperTheme.colors.secondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={[styles.cancelBtn, { backgroundColor: paperTheme.colors.surfaceVariant }]}
          >
            <Text style={[styles.cancelText, { color: paperTheme.colors.onSurfaceVariant }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  optionsWrap: {
    gap: 10,
    marginTop: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  optionSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.9,
  },
  cancelBtn: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
});
