import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HistoryStackParamList } from '../../../navigation/HistoryStackParamList';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { formatCheckoutAmount } from '../../../type/checkoutPayment';
import { formatCheckoutTime, getPaymentLabel } from './historyFormat';

type Props = NativeStackScreenProps<HistoryStackParamList, 'HistoryDetails'>;

function DetailRow({
  label,
  value,
  labelColor,
  valueColor,
}: {
  label: string;
  value: string;
  labelColor: string;
  valueColor: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export default function HistoryDetailsScreen({ navigation, route }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const record = route.params.record;
  const displayOrderId = record.orderId?.trim() || `#${record.cartNumber}`;

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
        <CommonHeader
          title={displayOrderId}
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: paperTheme.colors.primaryContainer,
                borderColor: `${paperTheme.colors.primary}33`,
              },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: paperTheme.colors.onPrimaryContainer }]}>
              Total paid
            </Text>
            <Text style={[styles.summaryAmount, { color: paperTheme.colors.primary }]}>
              {formatCheckoutAmount(record.totalAmount)}
            </Text>
            <Text style={[styles.summaryMeta, { color: paperTheme.colors.onPrimaryContainer }]}>
              {formatCheckoutTime(record.checkOutTime)}
            </Text>
          </View>

          <View
            style={[
              styles.section,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
              Order info
            </Text>
            <DetailRow
              label="Order ID"
              value={record.orderId?.trim() || '—'}
              labelColor={paperTheme.colors.onSurfaceVariant}
              valueColor={paperTheme.colors.onSurface}
            />
            <DetailRow
              label="Cart #"
              value={`#${record.cartNumber}`}
              labelColor={paperTheme.colors.onSurfaceVariant}
              valueColor={paperTheme.colors.onSurface}
            />
            <DetailRow
              label="Payment"
              value={getPaymentLabel(record.paymentOption)}
              labelColor={paperTheme.colors.onSurfaceVariant}
              valueColor={paperTheme.colors.onSurface}
            />
            <DetailRow
              label="Handled by"
              value={record.submittedUserName}
              labelColor={paperTheme.colors.onSurfaceVariant}
              valueColor={paperTheme.colors.onSurface}
            />
            <DetailRow
              label="Customer name"
              value={record.customerName.trim() || '—'}
              labelColor={paperTheme.colors.onSurfaceVariant}
              valueColor={paperTheme.colors.onSurface}
            />
            <DetailRow
              label="Customer mobile"
              value={record.customerMobile.trim() || '—'}
              labelColor={paperTheme.colors.onSurfaceVariant}
              valueColor={paperTheme.colors.onSurface}
            />
          </View>

          <View
            style={[
              styles.section,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
              Items ({record.items.length})
            </Text>
            {record.items.map((entry) => {
              const lineTotal =
                entry.unitCost != null
                  ? Number((entry.unitCost * entry.qty).toFixed(2))
                  : null;

              return (
                <View
                  key={`${record._id}-${entry.productId}`}
                  style={[
                    styles.itemRow,
                    { borderBottomColor: paperTheme.colors.outlineVariant },
                  ]}
                >
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemName, { color: paperTheme.colors.onSurface }]}>
                      {entry.productName}
                    </Text>
                    <Text style={[styles.itemMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Qty {entry.qty}
                      {entry.unitCost != null
                        ? ` · Unit ${formatCheckoutAmount(entry.unitCost)}`
                        : ''}
                    </Text>
                  </View>
                  <Text style={[styles.itemAmount, { color: paperTheme.colors.primary }]}>
                    {lineTotal != null ? formatCheckoutAmount(lineTotal) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>

          <View
            style={[
              styles.section,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
              Payment summary
            </Text>
            <DetailRow
              label="Subtotal"
              value={formatCheckoutAmount(record.amount)}
              labelColor={paperTheme.colors.onSurfaceVariant}
              valueColor={paperTheme.colors.onSurface}
            />
            {record.isDiscount && record.discountedAmount > 0 ? (
              <DetailRow
                label="Discount"
                value={`-${formatCheckoutAmount(record.discountedAmount)}`}
                labelColor={paperTheme.colors.onSurfaceVariant}
                valueColor={paperTheme.colors.error}
              />
            ) : null}
            <View style={[styles.totalRow, { borderTopColor: paperTheme.colors.outlineVariant }]}>
              <Text style={[styles.totalLabel, { color: paperTheme.colors.onSurface }]}>
                Total
              </Text>
              <Text style={[styles.totalValue, { color: paperTheme.colors.primary }]}>
                {formatCheckoutAmount(record.totalAmount)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  summaryLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
  },
  summaryAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  summaryMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    flex: 1,
  },
  detailValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    flex: 1.2,
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  itemMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  itemAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  totalValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 18,
  },
});
