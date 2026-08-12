import React, { useCallback, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { fonts } from '../../../constants/fonts';
import { LoginShop } from '../../../type/auth';
import { formatCheckoutAmount } from '../../../type/checkoutPayment';
import { HistoryRecord } from '../../../type/history';
import {
  formatCheckoutTime,
  getHistoryStatusLabel,
  getPaymentLabel,
  normalizeHistoryStatus,
} from './historyFormat';
import { formatDisplayOrderNumber } from '../../../utils/orderNumber';
import { buildReceiptShareMessage } from './historyReceiptShare';
import { formatHistoryItemWarranty } from '../../../utils/warranty';

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
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.receiptRow}>
      <Text style={[styles.receiptLabel, bold && styles.receiptBold]}>{label}</Text>
      <Text
        style={[
          styles.receiptValue,
          bold && styles.receiptBold,
          valueColor ? { color: valueColor } : null,
        ]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

export default function HistoryReceiptModal({ visible, onClose, record, shop }: Props) {
  const receiptShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const shopName = shop?.shopName?.trim() || 'Shop';
  const shopAddress = shop?.address?.trim() || '—';
  const shopPhone = shop?.shopMobileNumber?.trim() || '';
  const ownerPhone = shop?.ownerMobileNumber?.trim() || '';
  const contactLine = [shopPhone, ownerPhone].filter(Boolean).join(' / ') || '—';
  const displayOrderId = formatDisplayOrderNumber(record.cartNumber, record.orderId);
  const customerName = record.customerName?.trim() || '—';
  const customerPhone = record.customerMobile?.trim() || '—';
  const hasDiscount = record.isDiscount && record.discountedAmount > 0;
  const normalizedStatus = normalizeHistoryStatus(record.status);
  const isCanceled = normalizedStatus === 'canceled';
  const isReversed = normalizedStatus === 'reversed';
  const isVoided = isCanceled || isReversed;
  const statusColor = isCanceled ? '#DC2626' : isReversed ? '#C2410C' : undefined;
  const thankYouMessage = isCanceled
    ? 'This receipt is canceled and is no longer valid.'
    : isReversed
      ? 'This receipt is reversed and is no longer valid.'
      : 'Thank you for shopping with us. Come again!';

  const shareTextFallback = useCallback(async () => {
    const { title, message, url } = buildReceiptShareMessage({ record, shop });
    const linkBlock = `\n\nView digital receipt:\n${url}`;

    await Share.share(
      Platform.OS === 'ios'
        ? { title, message, url }
        : { title, message: `${message}${linkBlock}` },
    );
  }, [record, shop]);

  const handleShare = useCallback(async () => {
    if (sharing) return;

    const { title } = buildReceiptShareMessage({ record, shop });
    setSharing(true);

    let imageUri: string | null = null;
    try {
      imageUri = await captureRef(receiptShotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
    } catch {
      imageUri = null;
    }

    try {
      if (imageUri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(imageUri, {
          mimeType: 'image/png',
          dialogTitle: title,
          UTI: 'public.png',
        });
      } else {
        await shareTextFallback();
      }
    } catch {
      // User dismissed the share sheet.
    } finally {
      setSharing(false);
    }
  }, [record, shop, shareTextFallback, sharing]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetWrap} onPress={(event) => event.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Sales receipt</Text>
            <View style={styles.sheetHeaderActions}>
              <TouchableOpacity
                onPress={() => void handleShare()}
                hitSlop={12}
                accessibilityLabel="Share receipt"
                style={styles.headerActionBtn}
                disabled={sharing}
              >
                <Ionicons
                  name="share-outline"
                  size={22}
                  color={sharing ? '#94A3B8' : '#334155'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close receipt">
                <Ionicons name="close" size={22} color="#334155" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.receiptScroll}
            showsVerticalScrollIndicator={false}
          >
            <ViewShot
              ref={receiptShotRef}
              style={[styles.receiptPaper, isVoided && styles.receiptPaperVoided]}
              options={{ format: 'png', quality: 1, result: 'tmpfile' }}
            >
              {isVoided ? (
                <View
                  style={[
                    styles.statusBanner,
                    isCanceled ? styles.statusBannerCanceled : styles.statusBannerReversed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBannerTitle,
                      isCanceled ? styles.statusBannerTitleCanceled : styles.statusBannerTitleReversed,
                    ]}
                  >
                    {isCanceled ? 'CANCELED' : 'REVERSED'}
                  </Text>
                  <Text
                    style={[
                      styles.statusBannerText,
                      isCanceled ? styles.statusBannerTextCanceled : styles.statusBannerTextReversed,
                    ]}
                  >
                    {isCanceled ? 'This sale has been canceled.' : 'This sale has been reversed.'}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.shopName}>{shopName}</Text>
              <Text style={styles.shopMeta}>{shopAddress}</Text>
              <Text style={styles.shopMeta}>{contactLine}</Text>

              <ReceiptDivider />

              <Text style={styles.receiptHeading}>SALES RECEIPT</Text>
              <Text style={styles.receiptSubHeading}>Order {displayOrderId}</Text>

              <ReceiptDivider />

              <ReceiptRow label="Date" value={formatCheckoutTime(record.checkOutTime)} />
              <ReceiptRow label="Payment" value={getPaymentLabel(record.paymentOption)} />
              <ReceiptRow
                label="Status"
                value={getHistoryStatusLabel(record.status)}
                valueColor={statusColor}
                bold={isVoided}
              />
              {isVoided ? (
                <>
                  <ReceiptRow
                    label={isCanceled ? 'Canceled at' : 'Reversed at'}
                    value={record.reversedAt ? formatCheckoutTime(record.reversedAt) : '—'}
                  />
                  <ReceiptRow
                    label={isCanceled ? 'Canceled by' : 'Reversed by'}
                    value={record.reversedUserName?.trim() || '—'}
                  />
                </>
              ) : null}
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
                const warrantyLine = formatHistoryItemWarranty(entry);

                return (
                  <View key={`${record._id}-${entry.productId}`} style={styles.itemRow}>
                    <View style={styles.itemNameCol}>
                      <Text style={styles.itemName}>{entry.productName}</Text>
                      {entry.unitCost != null ? (
                        <Text style={styles.itemUnit}>
                          @ {formatCheckoutAmount(entry.unitCost)}
                        </Text>
                      ) : null}
                      {warrantyLine ? (
                        <Text style={styles.itemWarranty}>{warrantyLine}</Text>
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

              <Text style={styles.thankYou}>{thankYouMessage}</Text>
            </ViewShot>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => void handleShare()}
              style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
              disabled={sharing}
            >
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>
                {sharing ? 'Preparing…' : 'Share receipt'}
              </Text>
            </TouchableOpacity>
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
    flex: 1,
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    padding: 2,
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
  receiptPaperVoided: {
    borderColor: '#FECACA',
  },
  statusBanner: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  statusBannerReversed: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  statusBannerCanceled: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  statusBannerTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statusBannerTitleReversed: {
    color: '#9A3412',
  },
  statusBannerTitleCanceled: {
    color: '#B91C1C',
  },
  statusBannerText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    textAlign: 'center',
  },
  statusBannerTextReversed: {
    color: '#9A3412',
  },
  statusBannerTextCanceled: {
    color: '#B91C1C',
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
  itemWarranty: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
    color: '#0369A1',
    marginTop: 4,
    lineHeight: 14,
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
  shareBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  shareBtnDisabled: {
    opacity: 0.7,
  },
  shareBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
