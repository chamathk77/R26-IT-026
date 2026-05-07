import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainBottomTabParamList } from '../../navigation/MainBottomTabParamList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'Cart'>;

export default function CartScreen(_props: Props) {
  const { paperTheme, resolvedTheme } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>Cart</Text>
        <Text style={[styles.sub, { color: paperTheme.colors.onSurfaceVariant }]}>
          Review items before checkout.
        </Text>
        <View style={[styles.empty, { backgroundColor: paperTheme.colors.surface }]}>
          <Ionicons name="cart-outline" size={56} color={paperTheme.colors.outline} />
          <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
            Cart is empty
          </Text>
          <Text style={[styles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
            Add products from Home or scan items to build an order.
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.checkout, { backgroundColor: paperTheme.colors.surfaceVariant }]}
          disabled
        >
          <Text style={[styles.checkoutText, { color: paperTheme.colors.onSurfaceDisabled }]}>
            Checkout — $0.00
          </Text>
          <Ionicons name="arrow-forward" size={20} color={paperTheme.colors.onSurfaceDisabled} />
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16 },
  title: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 24,
    marginBottom: 8,
  },
  sub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginBottom: 20,
  },
  empty: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
    marginTop: 16,
  },
  emptySub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  checkout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 8,
  },
  checkoutText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
});
