import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { HistoryStackParamList } from '../../../navigation/HistoryStackParamList';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { formatCheckoutAmount } from '../../../type/checkoutPayment';
import {
  formatCheckoutTime,
  getHistoryStatusLabel,
  getPaymentLabel,
  normalizeHistoryStatus,
} from './historyFormat';
import { AppDispatch, RootState } from '../../../store/store';
import HistoryReceiptModal from './HistoryReceiptModal';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { reverseHistory_Service } from '../../../services/HistoryService';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../utils/apiErrorAlert';

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
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const record = route.params.record;
  const displayOrderId = record.orderId?.trim() || `#${record.cartNumber}`;
  const [submittingAction, setSubmittingAction] = useState<'reversed' | 'canceled' | null>(null);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const shop = useSelector((state: RootState) => state.AuthReducer.Login.shopData);
  const normalizedStatus = normalizeHistoryStatus(record.status);
  const isSubmittedStatus = normalizedStatus === 'submited';

  const statusMeta = useMemo(() => {
    if (normalizedStatus === 'reversed') {
      return {
        bg: paperTheme.colors.errorContainer,
        text: paperTheme.colors.error,
      };
    }
    if (normalizedStatus === 'canceled') {
      return {
        bg: paperTheme.colors.tertiaryContainer,
        text: paperTheme.colors.tertiary,
      };
    }
    return {
      bg: paperTheme.colors.primaryContainer,
      text: paperTheme.colors.primary,
    };
  }, [
    normalizedStatus,
    paperTheme.colors.error,
    paperTheme.colors.errorContainer,
    paperTheme.colors.primary,
    paperTheme.colors.primaryContainer,
    paperTheme.colors.tertiary,
    paperTheme.colors.tertiaryContainer,
  ]);

  const paymentMeta = useMemo(() => {
    switch (record.paymentOption) {
      case 'cash':
        return { bg: '#DCFCE7', text: '#15803D' };
      case 'card':
        return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'online':
        return { bg: '#EDE9FE', text: '#6D28D9' };
      default:
        return { bg: paperTheme.colors.surfaceVariant, text: paperTheme.colors.onSurface };
    }
  }, [paperTheme.colors.onSurface, paperTheme.colors.surfaceVariant, record.paymentOption]);

  const submitReverseAction = useCallback(
    async (status: 'reversed' | 'canceled') => {
      if (submittingAction) return;
      setSubmittingAction(status);
      try {
        await dispatch(
          reverseHistory_Service({
            id: record._id,
            status,
          }),
        ).unwrap();

        show_Alert(
          'success',
          'Success',
          status === 'canceled'
            ? 'Sale has been canceled and inventory is restored.'
            : 'Sale has been reversed and inventory is restored.',
          1,
          false,
          'OK',
          () => {
            navigation.goBack();
          },
        );
      } catch (error: unknown) {
        const handled = await handleSessionExpiredApiError(error, show_Alert);
        if (handled) return;
        show_Alert(
          'error',
          'Action failed',
          getApiErrorMessage(error, 'Could not update sale status. Please try again.'),
          1,
          false,
          'OK',
          () => {},
        );
      } finally {
        setSubmittingAction(null);
      }
    },
    [dispatch, navigation, record._id, show_Alert, submittingAction],
  );

  const confirmAction = useCallback(
    (status: 'reversed' | 'canceled') => {
      const title = status === 'canceled' ? 'Cancel this sale?' : 'Reverse this sale?';
      const message =
        status === 'canceled'
          ? 'This will mark the sale as canceled and restore inventory quantities for tracked products. Continue?'
          : 'This will mark the sale as reversed and restore inventory quantities for tracked products. Continue?';
      const buttonLabel = status === 'canceled' ? 'Cancel sale' : 'Reverse sale';

      show_Alert(
        'pending',
        title,
        message,
        2,
        false,
        buttonLabel,
        () => {
          void submitReverseAction(status);
        },
        'No',
        () => {},
      );
    },
    [show_Alert, submitReverseAction],
  );

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
              label="Status"
              value={getHistoryStatusLabel(record.status)}
              labelColor={paperTheme.colors.onSurfaceVariant}
              valueColor={statusMeta.text}
            />
            {normalizedStatus === 'reversed' || normalizedStatus === 'canceled' ? (
              <>
                <DetailRow
                  label="Reversed at"
                  value={record.reversedAt ? formatCheckoutTime(record.reversedAt) : '—'}
                  labelColor={paperTheme.colors.onSurfaceVariant}
                  valueColor={paperTheme.colors.onSurface}
                />
                <DetailRow
                  label="Reversed by"
                  value={record.reversedUserName?.trim() || '—'}
                  labelColor={paperTheme.colors.onSurfaceVariant}
                  valueColor={paperTheme.colors.onSurface}
                />
              </>
            ) : null}
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
            <View style={styles.chipsRow}>
              <View style={[styles.metaChip, { backgroundColor: paymentMeta.bg }]}>
                <Text style={[styles.metaChipText, { color: paymentMeta.text }]}>
                  {getPaymentLabel(record.paymentOption)}
                </Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: statusMeta.bg }]}>
                <Text style={[styles.metaChipText, { color: statusMeta.text }]}>
                  {getHistoryStatusLabel(record.status)}
                </Text>
              </View>
            </View>
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

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setReceiptVisible(true)}
            style={[
              styles.receiptBtn,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.primary,
              },
            ]}
          >
            <Ionicons name="receipt-outline" size={18} color={paperTheme.colors.primary} />
            <Text style={[styles.receiptBtnText, { color: paperTheme.colors.primary }]}>
              See receipt
            </Text>
          </TouchableOpacity>

          {isSubmittedStatus ? (
            <View style={styles.statusActionsRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={submittingAction !== null}
                onPress={() => confirmAction('canceled')}
                style={[
                  styles.statusActionBtn,
                  {
                    backgroundColor: paperTheme.colors.errorContainer,
                    borderColor: paperTheme.colors.error,
                    opacity: submittingAction ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.statusActionText, { color: paperTheme.colors.error }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={submittingAction !== null}
                onPress={() => confirmAction('reversed')}
                style={[
                  styles.statusActionBtn,
                  {
                    backgroundColor: paperTheme.colors.primaryContainer,
                    borderColor: paperTheme.colors.primary,
                    opacity: submittingAction ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.statusActionText, { color: paperTheme.colors.primary }]}>
                  Reverse
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      <HistoryReceiptModal
        visible={receiptVisible}
        onClose={() => setReceiptVisible(false)}
        record={record}
        shop={shop}
      />

      {alertConfig ? (
        <CommonAlert
          visible={visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          positiveButtonText={alertConfig.positiveButtonText}
          negativeButtonText={alertConfig.negativeButtonText}
          onPositivePress={alertConfig.onPositivePress}
          onNegativePress={alertConfig.onNegativePress}
          MoreDetails={alertConfig.MoreDetails}
          OtherDescirption={alertConfig.OtherDescirption}
          OtherButtonPress={alertConfig.OtherButtonPress}
          OtherButtonText={alertConfig.OtherButtonText}
          onClose={hideAlert}
        />
      ) : null}
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
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
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
  receiptBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  receiptBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  statusActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  statusActionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusActionText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
});
