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
import { fetchUpFrontPayment_Service } from '../../../../services/PaymentService';
import { PaymentRecord } from '../../../../type/payment';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import { handleSessionExpiredApiError } from '../../../../utils/apiErrorAlert';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import { cardShadow } from '../../../settings/shared/settingsDetailStyles';
import {
  SettingsDetailRow,
  SettingsEmptyState,
  SettingsSection,
} from '../../../settings/shared/SettingsDetailComponents';
import { formatPaymentAmount } from '../../../../utils/paymentBreakdown';
import { payUpfrontStyles as styles } from './payUpfrontStyles';
import {
  getUpFrontHeroCardStyle,
  UpFrontPaymentStatusSection,
} from './UpFrontPaymentStatusSection';
import { getUpFrontStatusMeta } from './upFrontPaymentStatus';
import { clearLoginSession } from '../../../../store/reducers/AuthReducer';
import { clearUpFrontPayment } from '../../../../store/reducers/PaymentReducer';
import { clearSavedToken } from '../../../../utils/secureStorage';
import BankTransferDetailsSection from '../../../../components/billing/BankTransferDetailsSection';
import { isInAppBillingAllowed } from '../../../../utils/platformBilling';
import { showIosBillingContactAlert } from '../../../../utils/iosBillingContactAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'PayUpfrontScreen'>;

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

function shouldShowPayNow(status: PaymentRecord['status']): boolean {
  return status === 'rejected' || status === 'notPaid';
}

function getUpFrontHeroHint(
  payment: PaymentRecord,
): string {
  if (payment.status === 'pending') {
    return 'Your receipt was submitted and is awaiting admin approval.';
  }
  if (payment.status === 'rejected') {
    return isInAppBillingAllowed
      ? 'Please review the rejection reason above, then upload a new receipt and resubmit.'
      : 'Please review the rejection reason above, transfer again using the bank details below, then contact admin.';
  }
  if (payment.status === 'approve') {
    return 'Your up-front payment has been approved.';
  }
  return isInAppBillingAllowed
    ? 'Complete your one-time up-front payment to continue using Smart Cost.'
    : 'Complete your one-time up-front payment using the bank details below, then contact admin.';
}

function PaymentDetailCard({
  payment,
  paperTheme,
  resolvedTheme,
}: {
  payment: PaymentRecord;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: ReturnType<typeof useTheme>['resolvedTheme'];
}) {
  const statusMeta = getUpFrontStatusMeta(payment.status);
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
          <Ionicons name="card-outline" size={28} color={paperTheme.colors.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: paperTheme.colors.onSurface }]}>
          Up-front payment
        </Text>
        <Text
          style={[styles.heroReceipt, { color: paperTheme.colors.onSurfaceVariant }]}
        >
          {payment.receiptNumber}
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
          {getUpFrontHeroHint(payment)}
        </Text>
      </View>

      {showBankDetails ? (
        <BankTransferDetailsSection paperTheme={paperTheme} resolvedTheme={resolvedTheme} />
      ) : null}

      <SettingsSection title="Payment details" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
        <SettingsDetailRow
          icon="cash-outline"
          label="Payment amount"
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

export default function PayUpfrontScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const [refreshing, setRefreshing] = useState(false);

  const loading = useSelector((state: RootState) => state.PaymentReducer.upFrontPayment.loading);
  const error = useSelector((state: RootState) => state.PaymentReducer.upFrontPayment.error);
  const payment = useSelector((state: RootState) => state.PaymentReducer.upFrontPayment.payment);
  const shopData = useSelector((state: RootState) => state.AuthReducer.Login.shopData);

  const loadUpFrontPayment = useCallback(async () => {
    try {
      await dispatch(fetchUpFrontPayment_Service()).unwrap();
    } catch (loadError: unknown) {
      const handled = await handleSessionExpiredApiError(loadError, show_Alert);
      if (handled) return;
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadUpFrontPayment();
    }, [loadUpFrontPayment]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadUpFrontPayment();
    } finally {
      setRefreshing(false);
    }
  }, [loadUpFrontPayment]);

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
        'Choose your preferred payment method. Bank transfer lets you pay via your bank and upload the receipt. Pay online will be available soon.',
        2,
        false,
        'Bank transfer',
        () => {
          setTimeout(() => {
            navigation.navigate('PayUpfrontBankTransferScreen', {
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

  const handleContinueAfterApproval = useCallback(() => {
    const shopId = shopData?.shopId ?? payment?.shopId ?? '';
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'SelectSubscriptionScreen',
          params: { shopId },
        },
      ],
    });
  }, [navigation, payment?.shopId, shopData?.shopId]);

  const confirmLogout = useCallback(() => {
    show_Alert(
      'pending',
      'Log out',
      'Do you want to log out?',
      2,
      false,
      'Log out',
      async () => {
        await clearSavedToken();
        dispatch(clearLoginSession());
        dispatch(clearUpFrontPayment());
        navigation.reset({
          index: 0,
          routes: [{ name: 'LoginScreen' }],
        });
      },
      'Cancel',
      () => {},
    );
  }, [dispatch, navigation, show_Alert]);

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
          title="Up-front payment"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={confirmLogout}
        />

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
                    resolvedTheme === 'dark' ? '#422006' : '#fffbeb',
                  borderColor: '#f59e0b',
                },
              ]}
            >
              <Text style={[styles.trialBannerTitle, { color: '#92400e' }]}>
                Trial ended
              </Text>
              <Text style={[styles.trialBannerText, { color: '#78350f' }]}>
                Your trial has ended. Please complete your one-time up-front payment to
                continue using Smart Cost.
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
                onPress={() => void loadUpFrontPayment()}
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

                {payment.status === 'approve' ||
                shopData?.status === 'initialPaymentApproved' ? (
                  <TouchableOpacity
                    style={[
                      styles.payNowButton,
                      { backgroundColor: paperTheme.colors.primary },
                    ]}
                    onPress={handleContinueAfterApproval}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[
                        styles.payNowButtonText,
                        { color: paperTheme.colors.onPrimary },
                      ]}
                    >
                      Continue to subscription
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
          </ScrollView>
        )}

        {loading && payment ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
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
