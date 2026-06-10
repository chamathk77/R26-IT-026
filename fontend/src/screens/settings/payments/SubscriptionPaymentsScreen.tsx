import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../store/store';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { fonts } from '../../../constants/fonts';
import {
  fetchPaymentsByShop_Service,
  getReceiptImageUrl,
} from '../../../services/PaymentService';
import { PaymentRecord, PaymentStatus, PaymentType } from '../../../type/payment';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { handleSessionExpiredApiError } from '../../../utils/apiErrorAlert';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { cardShadow, settingsDetailStyles as styles } from '../shared/settingsDetailStyles';
import { SettingsBadge, SettingsEmptyState } from '../shared/SettingsDetailComponents';

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionPayments'>;

type PaymentTypeFilter = 'all' | PaymentType;
type StatusFilter = 'all' | PaymentStatus;

const PAYMENT_TYPE_OPTIONS: { key: PaymentTypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'upFront', label: 'Up-front' },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approve', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'notPaid', label: 'Not paid' },
];

function formatDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(amount: number | null): string {
  if (amount == null) return '—';
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function formatPaymentMonth(month: string | null): string {
  if (!month) return '—';
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function getPaymentTitle(payment: PaymentRecord): string {
  if (payment.paymentType === 'upFront') {
    return 'Up-front payment';
  }
  return `${formatPaymentMonth(payment.paymentMonth)} subscription`;
}

function getSummaryTitle(typeFilter: PaymentTypeFilter): string {
  if (typeFilter === 'upFront') return 'Up-front payment';
  if (typeFilter === 'subscription') return 'Subscription payment';
  return 'All payments';
}

function formatPaymentType(type: PaymentType): string {
  return type === 'upFront' ? 'Up-front' : 'Subscription';
}

function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatReceiptUploadStatus(receiptImagePath: string): string {
  return receiptImagePath === 'pending-upload' ? 'Pending upload' : 'Uploaded';
}

function shouldShowPayNow(status: PaymentStatus): boolean {
  return status === 'rejected' || status === 'notPaid';
}

function getStatusMeta(status: PaymentStatus) {
  switch (status) {
    case 'approve':
      return {
        label: 'Approved',
        tone: 'success' as const,
        icon: 'checkmark-circle-outline' as const,
        color: '#15803d',
      };
    case 'pending':
      return {
        label: 'Pending',
        tone: 'warning' as const,
        icon: 'time-outline' as const,
        color: '#b45309',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        tone: 'neutral' as const,
        icon: 'close-circle-outline' as const,
        color: '#dc2626',
      };
    case 'notPaid':
    default:
      return {
        label: 'Not paid',
        tone: 'neutral' as const,
        icon: 'alert-circle-outline' as const,
        color: '#64748b',
      };
  }
}

function getStatusHighlight(
  status: PaymentStatus,
  resolvedTheme: 'light' | 'dark',
): { borderColor: string; backgroundColor: string; accentColor: string } {
  const isDark = resolvedTheme === 'dark';

  switch (status) {
    case 'approve':
      return {
        borderColor: '#86efac',
        backgroundColor: isDark ? '#052e16' : '#f0fdf4',
        accentColor: '#15803d',
      };
    case 'pending':
      return {
        borderColor: '#fcd34d',
        backgroundColor: isDark ? '#422006' : '#fffbeb',
        accentColor: '#b45309',
      };
    case 'rejected':
      return {
        borderColor: '#fca5a5',
        backgroundColor: isDark ? '#450a0a' : '#fef2f2',
        accentColor: '#dc2626',
      };
    case 'notPaid':
    default:
      return {
        borderColor: isDark ? '#475569' : '#cbd5e1',
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
        accentColor: '#64748b',
      };
  }
}

function FilterChipRow<T extends string>({
  options,
  selected,
  onSelect,
  paperTheme,
}: {
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={paymentStyles.filterRow}
    >
      {options.map((option) => {
        const isActive = selected === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={[
              paymentStyles.filterChip,
              {
                backgroundColor: isActive
                  ? paperTheme.colors.primary
                  : paperTheme.colors.surface,
                borderColor: isActive
                  ? paperTheme.colors.primary
                  : paperTheme.colors.outlineVariant,
              },
            ]}
          >
            <Text
              style={[
                paymentStyles.filterChipText,
                {
                  color: isActive
                    ? paperTheme.colors.onPrimary
                    : paperTheme.colors.onSurface,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function PaymentDetailRow({
  label,
  value,
  paperTheme,
}: {
  label: string;
  value: string;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
}) {
  return (
    <View style={paymentStyles.detailRow}>
      <Text style={[paymentStyles.detailLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text style={[paymentStyles.detailValue, { color: paperTheme.colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
}

function PaymentHistoryCard({
  payment,
  paperTheme,
  resolvedTheme,
  isExpanded,
  onToggle,
  onPayNow,
}: {
  payment: PaymentRecord;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
  isExpanded: boolean;
  onToggle: () => void;
  onPayNow: () => void;
}) {
  const statusMeta = getStatusMeta(payment.status);
  const highlight = getStatusHighlight(payment.status, resolvedTheme);
  const receiptImageUrl = getReceiptImageUrl(payment.receiptImagePath);
  const showPayNow = isExpanded && shouldShowPayNow(payment.status);

  return (
    <View
      style={[
        paymentStyles.historyCard,
        {
          backgroundColor: isExpanded
            ? paperTheme.colors.primaryContainer
            : highlight.backgroundColor,
          borderColor: highlight.borderColor,
          borderLeftColor: highlight.accentColor,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      <TouchableOpacity activeOpacity={0.92} onPress={onToggle}>
      <View style={paymentStyles.historyTop}>
        <View style={paymentStyles.historyTitleBlock}>
          <Text style={[paymentStyles.monthText, { color: paperTheme.colors.onSurface }]}>
            {getPaymentTitle(payment)}
          </Text>
          <Text
            style={[
              paymentStyles.receiptText,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            {payment.receiptNumber}
          </Text>
        </View>
        <View style={paymentStyles.historyTopTrailing}>
          <SettingsBadge
            label={statusMeta.label}
            tone={statusMeta.tone}
            paperTheme={paperTheme}
          />
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={paperTheme.colors.onSurfaceVariant}
          />
        </View>
      </View>

      <View style={paymentStyles.metaRow}>
        <View style={paymentStyles.metaItem}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={paperTheme.colors.onSurfaceVariant}
          />
          <Text
            style={[
              paymentStyles.metaText,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            Submitted {formatDate(payment.submittedDate)}
          </Text>
        </View>
        <Text style={[paymentStyles.amountText, { color: paperTheme.colors.onSurface }]}>
          {formatAmount(payment.paymentAmount)}
        </Text>
      </View>
      </TouchableOpacity>

      {isExpanded ? (
        <View style={paymentStyles.expandedSection}>
          <PaymentDetailRow
            label="Shop ID"
            value={payment.shopId}
            paperTheme={paperTheme}
          />
          <PaymentDetailRow
            label="Payment type"
            value={formatPaymentType(payment.paymentType)}
            paperTheme={paperTheme}
          />
          <PaymentDetailRow
            label="Payment month"
            value={formatPaymentMonth(payment.paymentMonth)}
            paperTheme={paperTheme}
          />
          <PaymentDetailRow
            label="Exact payment day"
            value={formatDateTime(payment.exactPaymentDay)}
            paperTheme={paperTheme}
          />
          <PaymentDetailRow
            label="Receipt upload"
            value={formatReceiptUploadStatus(payment.receiptImagePath)}
            paperTheme={paperTheme}
          />
          <PaymentDetailRow
            label="Created"
            value={formatDateTime(payment.createdAt)}
            paperTheme={paperTheme}
          />
          <PaymentDetailRow
            label="Last updated"
            value={formatDateTime(payment.updatedAt)}
            paperTheme={paperTheme}
          />

          {receiptImageUrl ? (
            <TouchableOpacity
              style={paymentStyles.receiptPreviewWrap}
              onPress={() => void Linking.openURL(receiptImageUrl)}
            >
              <Image
                source={{ uri: receiptImageUrl }}
                style={paymentStyles.receiptPreview}
                resizeMode="cover"
              />
              <Text
                style={[
                  paymentStyles.receiptPreviewText,
                  { color: paperTheme.colors.primary },
                ]}
              >
                View receipt image
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {payment.reason ? (
        <View
          style={[
            paymentStyles.reasonBox,
            {
              backgroundColor: resolvedTheme === 'dark' ? '#450a0a' : '#fef2f2',
              borderColor: '#fecaca',
            },
          ]}
        >
          <Text style={[paymentStyles.reasonText, { color: '#b91c1c' }]}>
            {payment.reason}
          </Text>
        </View>
      ) : null}

      {showPayNow ? (
        <TouchableOpacity
          style={[
            paymentStyles.payNowButton,
            { backgroundColor: paperTheme.colors.primary },
          ]}
          onPress={onPayNow}
          activeOpacity={0.9}
        >
          <Text style={[paymentStyles.payNowButtonText, { color: paperTheme.colors.onPrimary }]}>
            Pay now
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function SubscriptionPaymentsScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );
  const { items: payments, loading } = useSelector(
    (state: RootState) => state.PaymentReducer.shopPayments,
  );

  const [paymentTypeFilter, setPaymentTypeFilter] = useState<PaymentTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    if (!shopId) {
      setTimeout(() => {
        show_Alert(
          'error',
          'Error',
          'Shop not found. Please log in again.',
          1,
          false,
          'OK',
          () => {},
        );
      }, 150);
      return;
    }

    try {
      const response = await dispatch(fetchPaymentsByShop_Service(String(shopId))).unwrap();
      console.log('response in loadPayments', response);
    } catch (error: unknown) {
      console.log('error in loadPayments', error);

      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        const message =
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: string }).message)
            : 'Could not load payments. Please try again.';
        show_Alert(
          'error',
          'Load failed',
          message,
          2,
          false,
          'Retry',
          () => {
            void loadPayments();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [dispatch, shopId, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadPayments();
    }, [loadPayments]),
  );

  const filteredPayments = useMemo(() => {
    return payments
      .filter(
        (payment) =>
          paymentTypeFilter === 'all' || payment.paymentType === paymentTypeFilter,
      )
      .filter(
        (payment) => statusFilter === 'all' || payment.status === statusFilter,
      )
      .sort(
        (a, b) =>
          new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime(),
      );
  }, [payments, paymentTypeFilter, statusFilter]);

  const latestPayment = filteredPayments[0] ?? null;
  const currentStatus = getStatusMeta(latestPayment?.status ?? 'notPaid');

  const togglePaymentCard = useCallback((paymentId: string) => {
    setExpandedPaymentId((current) => (current === paymentId ? null : paymentId));
  }, []);

  const showPayOnlineComingSoonAlert = useCallback(() => {
    setTimeout(() => {
      show_Alert(
        'pending',
        'Coming soon',
        'Pay online is still under development. Please use bank transfer and upload your receipt for now.',
        1,
        false,
        'OK',
        () => {},
      );
    }, 350);
  }, [show_Alert]);

  const showPaymentMethodAlert = useCallback(
    (payment: PaymentRecord) => {
      show_Alert(
        'pending',
        'How would you like to pay?',
        'Choose your preferred payment method. Bank transfer lets you pay via your bank and upload the receipt. Pay online will be available soon.',
        2,
        false,
        'Bank transfer',
        () => {
          setTimeout(() => {
            navigation.navigate('PayNow', { payment });
          }, 350);
        },
        'Pay online',
        showPayOnlineComingSoonAlert,
      );
    },
    [navigation, show_Alert, showPayOnlineComingSoonAlert],
  );

  if (!shopId && !loading) {
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
            title="Payments"
            titleColor={paperTheme.colors.onBackground}
            iconColor={paperTheme.colors.onBackground}
            onPressLeftBtn={() => navigation.goBack()}
          />
          <SettingsEmptyState
            icon="wallet-outline"
            title="No shop data"
            description="Payment history loads when you sign in. Please log in again if this screen is empty."
            paperTheme={paperTheme}
          />

          {alertConfig && (
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
              onClose={hideAlert}
              MoreDetails={alertConfig.MoreDetails}
              OtherDescirption={alertConfig.OtherDescirption}
              OtherButtonPress={alertConfig.OtherButtonPress}
              OtherButtonText={alertConfig.OtherButtonText}
            />
          )}
        </SafeAreaView>
      </>
    );
  }

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
          title="Payments"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[
              paymentStyles.filterSectionLabel,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            Payment type
          </Text>
          <FilterChipRow<PaymentTypeFilter>
            options={PAYMENT_TYPE_OPTIONS}
            selected={paymentTypeFilter}
            onSelect={setPaymentTypeFilter}
            paperTheme={paperTheme}
          />

          <Text
            style={[
              paymentStyles.filterSectionLabel,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            Status
          </Text>
          <FilterChipRow<StatusFilter>
            options={STATUS_OPTIONS}
            selected={statusFilter}
            onSelect={setStatusFilter}
            paperTheme={paperTheme}
          />

          <View
            style={[
              paymentStyles.summaryCard,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              cardShadow(resolvedTheme),
            ]}
          >
            <View
              style={[
                paymentStyles.summaryIcon,
                { backgroundColor: paperTheme.colors.primaryContainer },
              ]}
            >
              <Ionicons
                name="wallet-outline"
                size={28}
                color={paperTheme.colors.primary}
              />
            </View>
            <Text style={[paymentStyles.summaryTitle, { color: paperTheme.colors.onSurface }]}>
              {getSummaryTitle(paymentTypeFilter)}
            </Text>
            <Text
              style={[
                paymentStyles.summarySubtitle,
                { color: paperTheme.colors.onSurfaceVariant },
              ]}
            >
              {filteredPayments.length} record{filteredPayments.length === 1 ? '' : 's'} shown
            </Text>

            <View style={paymentStyles.currentStatusRow}>
              <Text
                style={[
                  paymentStyles.currentStatusLabel,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                Latest status
              </Text>
              <View style={paymentStyles.currentStatusValue}>
                <Ionicons
                  name={currentStatus.icon}
                  size={16}
                  color={currentStatus.color}
                />
                <Text
                  style={[
                    paymentStyles.currentStatusText,
                    { color: currentStatus.color },
                  ]}
                >
                  {latestPayment ? currentStatus.label : 'No records'}
                </Text>
              </View>
            </View>

            {latestPayment ? (
              <View
                style={[
                  paymentStyles.latestBanner,
                  {
                    backgroundColor:
                      resolvedTheme === 'dark' ? '#422006' : '#fffbeb',
                    borderColor: '#f59e0b',
                  },
                ]}
              >
                <Text style={[paymentStyles.latestLabel, { color: '#92400e' }]}>
                  Latest submission
                </Text>
                <Text style={[paymentStyles.latestValue, { color: '#78350f' }]}>
                  {getPaymentTitle(latestPayment)} — {latestPayment.receiptNumber}
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={[
              paymentStyles.sectionLabel,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            Payment history
          </Text>

          {!loading && filteredPayments.length === 0 ? (
            <SettingsEmptyState
              icon="receipt-outline"
              title="No payments found"
              description="Try changing the payment type or status filter, or submit a payment to see it here."
              paperTheme={paperTheme}
            />
          ) : (
            filteredPayments.map((payment) => (
              <PaymentHistoryCard
                key={payment._id}
                payment={payment}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
                isExpanded={expandedPaymentId === payment._id}
                onToggle={() => togglePaymentCard(payment._id)}
                onPayNow={() => showPaymentMethodAlert(payment)}
              />
            ))
          )}
        </ScrollView>

        {loading && (
          <View style={paymentStyles.loadingOverlay}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text
              style={[
                paymentStyles.loadingText,
                { color: paperTheme.colors.onSurface },
              ]}
            >
              Loading payments...
            </Text>
          </View>
        )}

        {alertConfig && (
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
            onClose={hideAlert}
            MoreDetails={alertConfig.MoreDetails}
            OtherDescirption={alertConfig.OtherDescirption}
            OtherButtonPress={alertConfig.OtherButtonPress}
            OtherButtonText={alertConfig.OtherButtonText}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const paymentStyles = StyleSheet.create({
  filterSectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 20,
    lineHeight: 26,
  },
  summarySubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginTop: 4,
  },
  currentStatusRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  currentStatusLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  currentStatusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentStatusText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  latestBanner: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  latestLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  latestValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  historyCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    padding: 16,
    marginBottom: 12,
  },
  historyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyTopTrailing: {
    alignItems: 'flex-end',
    gap: 8,
  },
  historyTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  monthText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  receiptText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    flexShrink: 1,
  },
  amountText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
  },
  reasonBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  reasonText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    flex: 1,
  },
  detailValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    flex: 1.2,
    textAlign: 'right',
  },
  receiptPreviewWrap: {
    marginTop: 4,
    alignItems: 'center',
    gap: 8,
  },
  receiptPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  receiptPreviewText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  payNowButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  payNowButtonText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
    marginTop: 14,
    letterSpacing: 0.5,
  },
});
