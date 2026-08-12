import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PaymentRecord } from '../../../../type/payment';
import { fonts } from '../../../../constants/fonts';
import {
  formatPaymentAmount,
  getPaymentLineItems,
} from '../../../../utils/paymentBreakdown';

type ThemeColors = {
  onSurface: string;
  onSurfaceVariant: string;
  outlineVariant: string;
  primary: string;
};

export default function PaymentBreakdownList({
  payment,
  paperTheme,
  showTotal = true,
  compact = false,
}: {
  payment: PaymentRecord;
  paperTheme: { colors: ThemeColors };
  showTotal?: boolean;
  compact?: boolean;
}) {
  const lineItems = getPaymentLineItems(payment);

  return (
    <View
      style={[
        styles.container,
        compact ? styles.containerCompact : null,
        { borderColor: paperTheme.colors.outlineVariant },
      ]}
    >
      <Text style={[styles.title, { color: paperTheme.colors.onSurfaceVariant }]}>
        Payment breakdown
      </Text>

      {lineItems.map((item, index) => (
        <View
          key={`${item.name}-${index}`}
          style={[
            styles.row,
            index < lineItems.length - 1 ? styles.rowDivider : null,
            { borderBottomColor: paperTheme.colors.outlineVariant },
          ]}
        >
          <Text
            style={[
              styles.itemName,
              compact ? styles.itemNameCompact : null,
              { color: paperTheme.colors.onSurface },
            ]}
          >
            {item.name}
          </Text>
          <Text
            style={[
              styles.itemAmount,
              compact ? styles.itemAmountCompact : null,
              { color: paperTheme.colors.onSurface },
            ]}
          >
            {formatPaymentAmount(item.amount)}
          </Text>
        </View>
      ))}

      {showTotal ? (
        <View style={[styles.totalRow, { borderTopColor: paperTheme.colors.outlineVariant }]}>
          <Text style={[styles.totalLabel, { color: paperTheme.colors.onSurface }]}>
            Total due
          </Text>
          <Text style={[styles.totalAmount, { color: paperTheme.colors.primary }]}>
            {formatPaymentAmount(payment.paymentAmount)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 0,
  },
  containerCompact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemName: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  itemNameCompact: {
    fontSize: 12,
    lineHeight: 18,
  },
  itemAmount: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    textAlign: 'right',
  },
  itemAmountCompact: {
    fontSize: 12,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  totalAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
});
