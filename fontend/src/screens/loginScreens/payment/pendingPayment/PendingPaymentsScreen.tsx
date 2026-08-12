import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
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
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../context/ThemeContext';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import { fonts } from '../../../../constants/fonts';
import { AppDispatch, RootState } from '../../../../store/store';
import { fetchPaymentsByShop_Service } from '../../../../services/PaymentService';
import {
  PaymentRecord,
  PaymentStatus,
  PaymentSubscriptionType,
  PaymentType,
} from '../../../../type/payment';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import { handleSessionExpiredApiError } from '../../../../utils/apiErrorAlert';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import {
  cardShadow,
  settingsDetailStyles as detailStyles,
} from '../../../settings/shared/settingsDetailStyles';
import {
  SettingsBadge,
  SettingsEmptyState,
} from '../../../settings/shared/SettingsDetailComponents';
import PaymentBreakdownList from '../../../settings/paymentAndFeature/payment/PaymentBreakdownList';
import {
  formatPaymentAmount,
  hasPaymentBreakdown,
} from '../../../../utils/paymentBreakdown';
import { clearLoginSession } from '../../../../store/reducers/AuthReducer';
import { clearSavedToken } from '../../../../utils/secureStorage';
import BankTransferDetailsSection from '../../../../components/billing/BankTransferDetailsSection';
import { isInAppBillingAllowed } from '../../../../utils/platformBilling';
import { showIosBillingContactAlert } from '../../../../utils/iosBillingContactAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'PendingPayments'>;

const SUBSCRIPTION_TYPE_LABELS: Record<PaymentSubscriptionType, string> = {
  '1month': 'Monthly Plan',
  '3months': 'Quarterly Plan',
  '6months': 'Half-Year Plan',
  '1year': 'Annual Plan',
};

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(isoDate: string | null | undefined): string {
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

function formatPaymentType(type: PaymentType): string {
  if (type === 'upFront') return 'Up-front';
  if (type === 'sms') return 'SMS';
  return 'Subscription';
}

function formatSubscriptionTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  return SUBSCRIPTION_TYPE_LABELS[type as PaymentSubscriptionType] ?? type;
}

function getPaymentTitle(payment: PaymentRecord): string {
  if (payment.paymentType === 'upFront') return 'Up-front payment';
  if (payment.paymentType === 'sms') return 'SMS package billing';
  if (payment.subscriptionType) {
    return `${formatSubscriptionTypeLabel(payment.subscriptionType)} · Subscription`;
  }
  return 'Subscription payment';
}

function shouldShowPayNow(status: PaymentStatus): boolean {
  return status === 'rejected' || status === 'notPaid';
}

function getStatusMeta(status: PaymentStatus) {
  switch (status) {
    case 'approve':
      return { label: 'Approved', tone: 'success' as const, color: '#15803d' };
    case 'pending':
      return { label: 'Pending', tone: 'warning' as const, color: '#b45309' };
    case 'rejected':
      return { label: 'Rejected', tone: 'neutral' as const, color: '#dc2626' };
    case 'notPaid':
    default:
      return { label: 'Not paid', tone: 'neutral' as const, color: '#64748b' };
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
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: paperTheme.colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
}

function PendingPaymentCard({
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
  const showPayNow = isExpanded && shouldShowPayNow(payment.status);
  const showBreakdown = hasPaymentBreakdown(payment);

  return (
    <View
      style={[
        styles.historyCard,
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
        <View style={styles.historyTop}>
          <View style={styles.historyTitleBlock}>
            <Text style={[styles.monthText, { color: paperTheme.colors.onSurface }]}>
              {getPaymentTitle(payment)}
            </Text>
            <Text
              style={[styles.receiptText, { color: paperTheme.colors.onSurfaceVariant }]}
            >
              {payment.receiptNumber}
            </Text>
          </View>
          <View style={styles.historyTopTrailing}>
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

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={paperTheme.colors.onSurfaceVariant}
            />
            <Text
              style={[styles.metaText, { color: paperTheme.colors.onSurfaceVariant }]}
            >
              {payment.submittedDate
                ? `Submitted ${formatDate(payment.submittedDate)}`
                : 'Not submitted yet'}
            </Text>
          </View>
          <Text style={[styles.amountText, { color: paperTheme.colors.onSurface }]}>
            {formatPaymentAmount(payment.paymentAmount)}
          </Text>
        </View>
      </TouchableOpacity>

      {showBreakdown ? (
        <View style={styles.inlineBreakdownWrap}>
          <PaymentBreakdownList
            payment={payment}
            paperTheme={paperTheme}
            compact
            showTotal
          />
        </View>
      ) : null}

      {isExpanded ? (
        <View style={styles.expandedSection}>
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
          {payment.subscriptionType ? (
            <PaymentDetailRow
              label="Plan"
              value={formatSubscriptionTypeLabel(payment.subscriptionType)}
              paperTheme={paperTheme}
            />
          ) : null}
          {payment.description?.trim() ? (
            <PaymentDetailRow
              label="Description"
              value={payment.description.trim()}
              paperTheme={paperTheme}
            />
          ) : null}
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

          {payment.reason ? (
            <View
              style={[
                styles.reasonBox,
                {
                  backgroundColor: resolvedTheme === 'dark' ? '#450a0a' : '#fef2f2',
                  borderColor: '#fecaca',
                },
              ]}
            >
              <Text style={[styles.reasonText, { color: '#b91c1c' }]}>
                {payment.reason}
              </Text>
            </View>
          ) : null}

          {showPayNow ? (
            <TouchableOpacity
              style={[
                styles.payNowButton,
                { backgroundColor: paperTheme.colors.primary },
              ]}
              onPress={onPayNow}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.payNowButtonText,
                  { color: paperTheme.colors.onPrimary },
                ]}
              >
                {!isInAppBillingAllowed
                  ? 'Contact admin'
                  : payment.status === 'rejected'
                    ? 'Resubmit payment'
                    : 'Pay now'}
              </Text>
            </TouchableOpacity>
          ) : payment.status === 'pending' ? (
            <Text
              style={[styles.pendingHint, { color: paperTheme.colors.onSurfaceVariant }]}
            >
              Receipt submitted — waiting for admin approval.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function PendingPaymentsScreen({ navigation }: Props) {
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

  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!shopId) {
      return;
    }

    try {
      await dispatch(fetchPaymentsByShop_Service(String(shopId))).unwrap();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Error',
        error instanceof Error ? error.message : 'Could not load payments.',
        1,
        false,
        'OK',
        () => {},
      );
    }
  }, [dispatch, shopId, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadPayments();
    }, [loadPayments]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  }, [loadPayments]);

  const handleBackToLogin = useCallback(() => {
    void (async () => {
      await clearSavedToken();
      dispatch(clearLoginSession());
      navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
    })();
  }, [dispatch, navigation]);

  const showPayOnlineComingSoonAlert = useCallback(() => {
    setTimeout(() => {
      show_Alert(
        'pending',
        'Coming soon',
        'Pay online will be available in a future update. Please use bank transfer and upload your receipt for now.',
        1,
        false,
        'OK',
        () => {},
      );
    }, 350);
  }, [show_Alert]);

  const hasUnpaidPayments = payments.some((payment) => shouldShowPayNow(payment.status));

  const showPaymentMethodAlert = useCallback(
    (payment: PaymentRecord) => {
      if (!isInAppBillingAllowed) {
        showIosBillingContactAlert(show_Alert, {
          amount: payment.paymentAmount,
          receiptNumber: payment.receiptNumber,
          isResubmit: payment.status === 'rejected',
        });
        return;
      }

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

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[detailStyles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Pending payments"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={handleBackToLogin}
        />

        {loading && payments.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={detailStyles.scroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void onRefresh()}
                tintColor={paperTheme.colors.primary}
              />
            }
          >
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: resolvedTheme === 'dark' ? '#422006' : '#fffbeb',
                  borderColor: '#f59e0b',
                },
                cardShadow(resolvedTheme),
              ]}
            >
              <Ionicons name="alert-circle-outline" size={22} color="#b45309" />
              <View style={styles.bannerBody}>
                <Text style={[styles.bannerTitle, { color: '#92400e' }]}>
                  Account temporarily deactivated
                </Text>
                <Text style={[styles.bannerText, { color: '#78350f' }]}>
                  {isInAppBillingAllowed
                    ? 'Complete outstanding payments below. Expand a payment and tap Pay now to submit your bank transfer receipt.'
                    : 'Complete outstanding payments below. Transfer using the bank details below, then tap Contact admin on each payment.'}
                </Text>
              </View>
            </View>

            {!isInAppBillingAllowed && hasUnpaidPayments ? (
              <View style={styles.bankDetailsWrap}>
                <BankTransferDetailsSection
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />
              </View>
            ) : null}

            {!shopId ? (
              <SettingsEmptyState
                icon="storefront-outline"
                title="No shop data"
                description="Please log in again to load your payments."
                paperTheme={paperTheme}
              />
            ) : payments.length === 0 ? (
              <SettingsEmptyState
                icon="receipt-outline"
                title="No payments found"
                description="There are no payment records for this shop yet. Pull to refresh."
                paperTheme={paperTheme}
              />
            ) : (
              payments.map((payment) => (
                <PendingPaymentCard
                  key={payment._id}
                  payment={payment}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                  isExpanded={expandedPaymentId === payment._id}
                  onToggle={() =>
                    setExpandedPaymentId((current) =>
                      current === payment._id ? null : payment._id,
                    )
                  }
                  onPayNow={() => showPaymentMethodAlert(payment)}
                />
              ))
            )}
          </ScrollView>
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

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  bannerBody: {
    flex: 1,
  },
  bannerTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    marginBottom: 4,
  },
  bannerText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 19,
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
  },
  receiptText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
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
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  inlineBreakdownWrap: {
    marginTop: 12,
    paddingHorizontal: 2,
  },
  expandedSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#cbd5e1',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  detailLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  detailValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    textAlign: 'right',
    flex: 1,
  },
  reasonBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  reasonText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  payNowButton: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payNowButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  pendingHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginTop: 12,
  },
  bankDetailsWrap: {
    marginTop: 12,
    marginBottom: 4,
  },
});
