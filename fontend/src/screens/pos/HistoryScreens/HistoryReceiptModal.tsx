import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../../constants/fonts';
import { LoginShop } from '../../../type/auth';
import { formatCheckoutAmount } from '../../../type/checkoutPayment';
import { HistoryRecord } from '../../../type/history';
import {
  formatCheckoutTime,
  getHistoryStatusLabel,
  getPaymentLabel,
} from './historyFormat';

type Props = {
  visible: boolean;
  onClose: () => void;
  record: HistoryRecord;
  shop: LoginShop | null;
};

function ReceiptDivider() {
  return <View style={styles.divider} />;
}

function ReceiptRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.receiptRow}>
      <Text style={[styles.receiptLabel, bold && styles.receiptBold]}>{label}</Text>
      <Text style={[styles.receiptValue, bold && styles.receiptBold]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

export default function HistoryReceiptModal({ visible, onClose, record, shop }: Props) {
  const shopName = shop?.shopName?.trim() || 'Shop';
  const shopAddress = shop?.address?.trim() || '—';
  const shopPhone = shop?.shopMobileNumber?.trim() || '';
  const ownerPhone = shop?.ownerMobileNumber?.trim() || '';
  const contactLine = [shopPhone, ownerPhone].filter(Boolean).join(' / ') || '—';
  const displayOrderId = record.orderId?.trim() || '—';
  const customerName = record.customerName?.trim() || '—';
  const customerPhone = record.customerMobile?.trim() || '—';
  const hasDiscount = record.isDiscount && record.discountedAmount > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetWrap} onPress={(event) => event.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Sales receipt</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close receipt">
              <Ionicons name="close" size={22} color="#334155" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.receiptScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.receiptPaper}>
              <Text style={styles.shopName}>{shopName}</Text>
              <Text style={styles.shopMeta}>{shopAddress}</Text>
              <Text style={styles.shopMeta}>{contactLine}</Text>

              <ReceiptDivider />

              <Text style={styles.receiptHeading}>SALES RECEIPT</Text>
              <Text style={styles.receiptSubHeading}>Order {displayOrderId}</Text>

              <ReceiptDivider />

              <ReceiptRow label="Date" value={formatCheckoutTime(record.checkOutTime)} />
              <ReceiptRow label="Payment" value={getPaymentLabel(record.paymentOption)} />
              <ReceiptRow label="Status" value={getHistoryStatusLabel(record.status)} />
              <ReceiptRow label="Handled by" value={record.submittedUserName || '—'} />
              <ReceiptRow label="Customer name" value={customerName} />
              <ReceiptRow label="Customer phone" value={customerPhone} />

              <ReceiptDivider />

              <View style={styles.itemsHeader}>
                <Text style={[styles.itemsHeaderText, styles.itemNameCol]}>Item</Text>
                <Text style={[styles.itemsHeaderText, styles.itemQtyCol]}>Qty</Text>
                <Text style={[styles.itemsHeaderText, styles.itemAmountCol]}>Amount</Text>
              </View>

              {record.items.map((entry) => {
                const lineTotal =
                  entry.unitCost != null
                    ? Number((entry.unitCost * entry.qty).toFixed(2))
                    : null;

                return (
                  <View key={`${record._id}-${entry.productId}`} style={styles.itemRow}>
                    <View style={styles.itemNameCol}>
                      <Text style={styles.itemName}>{entry.productName}</Text>
                      {entry.unitCost != null ? (
                        <Text style={styles.itemUnit}>
                          @ {formatCheckoutAmount(entry.unitCost)}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.itemQty, styles.itemQtyCol]}>{entry.qty}</Text>
                    <Text style={[styles.itemAmount, styles.itemAmountCol]}>
                      {lineTotal != null ? formatCheckoutAmount(lineTotal) : '—'}
                    </Text>
                  </View>
                );
              })}

              <ReceiptDivider />

              <ReceiptRow label="Subtotal" value={formatCheckoutAmount(record.amount)} />
              {hasDiscount ? (
                <ReceiptRow
                  label="Discount"
                  value={`-${formatCheckoutAmount(record.discountedAmount)}`}
                />
              ) : null}
              <ReceiptRow
                label="Total"
                value={formatCheckoutAmount(record.totalAmount)}
                bold
              />

              <ReceiptDivider />

              <Text style={styles.thankYou}>Thank you for shopping with us. Come again!</Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  sheetWrap: {
    maxHeight: '88%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  sheetTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    color: '#0F172A',
  },
  receiptScroll: {
    padding: 16,
  },
  receiptPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  shopName: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
  },
  shopMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },
  receiptHeading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 13,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  receiptSubHeading: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    marginVertical: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  receiptLabel: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    color: '#64748B',
  },
  receiptValue: {
    flex: 1.2,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    color: '#0F172A',
    textAlign: 'right',
  },
  receiptBold: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 13,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemsHeaderText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  itemNameCol: {
    flex: 1,
    minWidth: 0,
  },
  itemQtyCol: {
    width: 34,
    textAlign: 'center',
  },
  itemAmountCol: {
    width: 72,
    textAlign: 'right',
  },
  itemName: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    color: '#0F172A',
  },
  itemUnit: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemQty: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    color: '#0F172A',
  },
  itemAmount: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    color: '#0F172A',
  },
  thankYou: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    color: '#0F172A',
    textAlign: 'center',
  },
});
