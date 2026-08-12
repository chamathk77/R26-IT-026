import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
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
import { AppDispatch, RootState } from '../../../../store/store';
import {
  fetchInitialSubscriptionPayment_Service,
  reverseSubscriptionSelection_Service,
} from '../../../../services/PaymentService';
import {
  PaymentRecord,
  PaymentSubscriptionType,
} from '../../../../type/payment';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../utils/apiErrorAlert';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import { cardShadow } from '../../../settings/shared/settingsDetailStyles';
import {
  SettingsDetailRow,
  SettingsEmptyState,
  SettingsSection,
} from '../../../settings/shared/SettingsDetailComponents';
import { formatPaymentAmount, hasPaymentBreakdown } from '../../../../utils/paymentBreakdown';
import PaymentBreakdownList from '../../../settings/paymentAndFeature/payment/PaymentBreakdownList';
import { payUpfrontStyles as styles } from '../upFrontPayment/payUpfrontStyles';
import {
  getUpFrontHeroCardStyle,
  UpFrontPaymentStatusSection,
} from '../upFrontPayment/UpFrontPaymentStatusSection';
import { getUpFrontStatusMeta } from '../upFrontPayment/upFrontPaymentStatus';
import { patchLoginShopData } from '../../../../store/reducers/AuthReducer';
import { clearInitialSubscriptionPayment } from '../../../../store/reducers/PaymentReducer';
import BankTransferDetailsSection from '../../../../components/billing/BankTransferDetailsSection';
import { isInAppBillingAllowed } from '../../../../utils/platformBilling';
import { showIosBillingContactAlert } from '../../../../utils/iosBillingContactAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'PayInitialSubscriptionScreen'>;

const PLAN_LABELS: Record<PaymentSubscriptionType, string> = {
  '1month': 'Monthly Plan',
  '3months': 'Quarterly Plan',
  '6months': 'Half-Year Plan',
  '1year': 'Annual Plan',
};

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

function formatPlanLabel(type: string | null | undefined): string {
  if (!type) return '—';
  return PLAN_LABELS[type as PaymentSubscriptionType] ?? type;
}

function shouldShowPayNow(status: PaymentRecord['status']): boolean {
  return status === 'rejected' || status === 'notPaid';
}

function getSubscriptionHeroHint(payment: PaymentRecord): string {
  if (payment.status === 'pending') {
    return 'Your receipt was submitted and is awaiting admin approval.';
  }
  if (payment.status === 'rejected') {
    return isInAppBillingAllowed
      ? 'Please review the rejection reason above, then upload a new receipt and resubmit.'
      : 'Please review the rejection reason above, transfer again using the bank details below, then contact admin.';
  }
  return isInAppBillingAllowed
    ? 'Pay your initial subscription invoice to activate your plan.'
    : 'Transfer the amount using the bank details below, then contact admin to activate your plan.';
}

function PaymentDetailCard({
  payment,
  subscriptionType,
  paperTheme,
  resolvedTheme,
}: {
  payment: PaymentRecord;
  subscriptionType: string | null;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: ReturnType<typeof useTheme>['resolvedTheme'];
}) {
  const statusMeta = getUpFrontStatusMeta(payment.status);
  const planLabel = formatPlanLabel(payment.subscriptionType ?? subscriptionType);
  const heroHighlightStyle = getUpFrontHeroCardStyle(payment, resolvedTheme);
  const showBankDetails =
    !isInAppBillingAllowed && shouldShowPayNow(payment.status);

  return (
    <>
      <View
        style={[
          styles.heroCard,
          heroHighlightStyle,
          cardShadow(resolvedTheme),
        ]}
      >
        <View
          style={[
            styles.heroIcon,
            { backgroundColor: paperTheme.colors.primaryContainer },
          ]}
        >
          <Ionicons name="wallet-outline" size={28} color={paperTheme.colors.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: paperTheme.colors.onSurface }]}>
          Subscription payment
        </Text>
        <Text
          style={[styles.heroReceipt, { color: paperTheme.colors.onSurfaceVariant }]}
        >
          {planLabel} · {payment.receiptNumber}
        </Text>
        <Text style={[styles.heroAmount, { color: paperTheme.colors.primary }]}>
          {formatPaymentAmount(payment.paymentAmount)}
        </Text>

        <UpFrontPaymentStatusSection
          payment={payment}
          paperTheme={paperTheme}
          resolvedTheme={resolvedTheme}
        />

        <Text
          style={[styles.heroHint, { color: paperTheme.colors.onSurfaceVariant }]}
        >
          {getSubscriptionHeroHint(payment)}
        </Text>
      </View>

      {showBankDetails ? (
        <BankTransferDetailsSection paperTheme={paperTheme} resolvedTheme={resolvedTheme} />
      ) : null}

      {hasPaymentBreakdown(payment) ? (
        <View style={{ marginBottom: 16 }}>
          <PaymentBreakdownList
            payment={payment}
            paperTheme={paperTheme}
            showTotal
          />
        </View>
      ) : null}

      <SettingsSection title="Payment details" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
        <SettingsDetailRow
          icon="layers-outline"
          label="Plan"
          value={planLabel}
          paperTheme={paperTheme}
        />
        <SettingsDetailRow
          icon="cash-outline"
          label={hasPaymentBreakdown(payment) ? 'Total amount' : 'Payment amount'}
          value={formatPaymentAmount(payment.paymentAmount)}
          paperTheme={paperTheme}
        />
        <SettingsDetailRow
          icon="flag-outline"
          label="Status"
          value={statusMeta.label}
          paperTheme={paperTheme}
        />
        <SettingsDetailRow
          icon="document-text-outline"
          label="Description"
          value={payment.description?.trim() || '—'}
          paperTheme={paperTheme}
        />
        <SettingsDetailRow
          icon="calendar-outline"
          label="Valid until"
          value={formatDateTime(payment.expiryDate)}
          paperTheme={paperTheme}
        />
        <SettingsDetailRow
          icon="time-outline"
          label="Submitted at"
          value={formatDateTime(payment.submittedDate)}
          paperTheme={paperTheme}
        />
        <SettingsDetailRow
          icon="receipt-outline"
          label="Receipt number"
          value={payment.receiptNumber}
          paperTheme={paperTheme}
          isLast
        />
      </SettingsSection>
    </>
  );
}

export default function PayInitialSubscriptionScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);

  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );

  const loading = useSelector(
    (state: RootState) => state.PaymentReducer.initialSubscriptionPayment.loading,
  );
  const error = useSelector(
    (state: RootState) => state.PaymentReducer.initialSubscriptionPayment.error,
  );
  const payment = useSelector(
    (state: RootState) => state.PaymentReducer.initialSubscriptionPayment.payment,
  );
  const subscriptionType = useSelector(
    (state: RootState) => state.PaymentReducer.initialSubscriptionPayment.subscriptionType,
  );

  const loadInitialSubscriptionPayment = useCallback(async () => {
    try {
      await dispatch(fetchInitialSubscriptionPayment_Service()).unwrap();
    } catch (loadError: unknown) {
      const handled = await handleSessionExpiredApiError(loadError, show_Alert);
      if (handled) return;
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadInitialSubscriptionPayment();
    }, [loadInitialSubscriptionPayment]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInitialSubscriptionPayment();
    } finally {
      setRefreshing(false);
    }
  }, [loadInitialSubscriptionPayment]);

  const showPayOnlineComingSoonAlert = useCallback(() => {
    setTimeout(() => {
      show_Alert(
        'pending',
        'Coming soon',
        'Online payment will be available in a future update. Please use bank transfer and upload your receipt for now.',
        1,
        false,
        'OK',
        () => {},
      );
    }, 350);
  }, [show_Alert]);

  const showPaymentMethodAlert = useCallback(
    (selectedPayment: PaymentRecord) => {
      if (!isInAppBillingAllowed) {
        showIosBillingContactAlert(show_Alert, {
          amount: selectedPayment.paymentAmount,
          receiptNumber: selectedPayment.receiptNumber,
          isResubmit: selectedPayment.status === 'rejected',
        });
        return;
      }

      show_Alert(
        'pending',
        'How would you like to pay?',
        'Choose your preferred payment method. Bank transfer lets you pay via your bank and upload the receipt. Online payment will be available soon.',
        2,
        false,
        'Bank transfer',
        () => {
          setTimeout(() => {
            navigation.navigate('PayInitialSubscriptionBankTransferScreen', {
              payment: selectedPayment,
            });
          }, 350);
        },
        'Pay online',
        showPayOnlineComingSoonAlert,
      );
    },
    [navigation, show_Alert, showPayOnlineComingSoonAlert],
  );

  const reverseSubscriptionAndSelectPlan = useCallback(async () => {
    if (changingPlan) {
      return;
    }

    setChangingPlan(true);
    try {
      const reverseResponse = await dispatch(
        reverseSubscriptionSelection_Service(),
      ).unwrap();

      dispatch(
        patchLoginShopData({
          status: reverseResponse.shop.status ?? 'initialPaymentApproved',
          subscriptionType: reverseResponse.shop.subscriptionType ?? null,
        }),
      );
      dispatch(clearInitialSubscriptionPayment());

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'SelectSubscriptionScreen',
            params: { shopId: reverseResponse.shopId || shopId },
          },
        ],
      });
    } catch (reverseError: unknown) {
      const handled = await handleSessionExpiredApiError(reverseError, show_Alert);
      if (handled) {
        return;
      }

      show_Alert(
        'error',
        'Could not change plan',
        getApiErrorMessage(
          reverseError,
          'Could not reset your subscription selection. Please try again.',
        ),
        1,
        false,
        'OK',
        () => {},
      );
    } finally {
      setChangingPlan(false);
    }
  }, [changingPlan, dispatch, navigation, shopId, show_Alert]);

  const confirmChangeSubscriptionPlan = useCallback(() => {
    show_Alert(
      'pending',
      'Change subscription plan?',
      'This will cancel your current subscription invoice so you can choose a different plan.',
      2,
      false,
      'Change plan',
      () => {
        setTimeout(() => {
          void reverseSubscriptionAndSelectPlan();
        }, 350);
      },
      'Cancel',
      () => {},
    );
  }, [reverseSubscriptionAndSelectPlan, show_Alert]);

  const showInitialLoad = loading && !payment && !refreshing;

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
          title="Subscription payment"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
        />

        <View style={styles.changePlanRow}>
          <TouchableOpacity
            style={[
              styles.changePlanButton,
              cardShadow(resolvedTheme),
              {
                borderColor:
                  resolvedTheme === 'dark'
                    ? 'rgba(147, 197, 253, 0.35)'
                    : 'rgba(59, 130, 246, 0.22)',
                backgroundColor:
                  resolvedTheme === 'dark' ? 'rgba(30, 58, 95, 0.55)' : '#eff6ff',
                opacity: changingPlan ? 0.7 : 1,
              },
            ]}
            onPress={confirmChangeSubscriptionPlan}
            disabled={changingPlan}
            activeOpacity={0.85}
          >
            {changingPlan ? (
              <ActivityIndicator size="small" color={paperTheme.colors.primary} />
            ) : (
              <>
                <Ionicons
                  name="swap-horizontal-outline"
                  size={16}
                  color={paperTheme.colors.primary}
                />
                <Text
                  style={[styles.changePlanButtonText, { color: paperTheme.colors.primary }]}
                >
                  Change subscription plan
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {showInitialLoad ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text
              style={[styles.stateDesc, { color: paperTheme.colors.onSurfaceVariant }]}
            >
              Loading payment details...
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void onRefresh()}
                tintColor={paperTheme.colors.primary}
                colors={[paperTheme.colors.primary]}
              />
            }
          >
            <View
              style={[
                styles.trialBanner,
                {
                  backgroundColor:
                    resolvedTheme === 'dark' ? '#1e3a5f' : '#eff6ff',
                  borderColor: '#3b82f6',
                },
              ]}
            >
              <Text style={[styles.trialBannerTitle, { color: '#1d4ed8' }]}>
                Activation pending
              </Text>
              <Text style={[styles.trialBannerText, { color: '#1e40af' }]}>
                {isInAppBillingAllowed
                  ? 'Complete your initial subscription payment to activate your selected plan.'
                  : 'Transfer using the bank details below, then contact admin to activate your selected plan.'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshRow}
              onPress={() => void onRefresh()}
              disabled={loading || refreshing}
              activeOpacity={0.8}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={paperTheme.colors.primary}
              />
              <Text style={[styles.refreshText, { color: paperTheme.colors.primary }]}>
                Refresh
              </Text>
            </TouchableOpacity>

            {error && !payment ? (
              <SettingsEmptyState
                icon="alert-circle-outline"
                title="Could not load payment"
                description={error}
                paperTheme={paperTheme}
              />
            ) : null}

            {error && !payment ? (
              <TouchableOpacity
                style={[
                  styles.retryButton,
                  { backgroundColor: paperTheme.colors.primaryContainer },
                ]}
                onPress={() => void loadInitialSubscriptionPayment()}
                activeOpacity={0.9}
              >
                <Text
                  style={[styles.retryButtonText, { color: paperTheme.colors.primary }]}
                >
                  Try again
                </Text>
              </TouchableOpacity>
            ) : null}

            {payment ? (
              <>
                <PaymentDetailCard
                  payment={payment}
                  subscriptionType={subscriptionType}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />

                {shouldShowPayNow(payment.status) ? (
                  <TouchableOpacity
                    style={[
                      styles.payNowButton,
                      { backgroundColor: paperTheme.colors.primary },
                    ]}
                    onPress={() => showPaymentMethodAlert(payment)}
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
                ) : null}
              </>
            ) : null}
          </ScrollView>
        )}

        {loading && payment && !changingPlan ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          </View>
        ) : null}

        {changingPlan ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onPrimary }]}>
              Updating subscription...
            </Text>
          </View>
        ) : null}

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
            onClose={hideAlert}
            MoreDetails={alertConfig.MoreDetails}
            OtherDescirption={alertConfig.OtherDescirption}
            OtherButtonPress={alertConfig.OtherButtonPress}
            OtherButtonText={alertConfig.OtherButtonText}
          />
        ) : null}
      </SafeAreaView>
    </>
  );
}
