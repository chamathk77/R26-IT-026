import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import { fonts } from '../../../constants/fonts';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { SubscriptionType } from '../../../type/onboarding';
import {
  fetchSubscriptionPlans_Service,
  setSubscription_Service,
} from '../../../services/ShopOnboardingService';
import { AppDispatch, RootState } from '../../../store/store';
import { patchLoginShopData, clearLoginSession } from '../../../store/reducers/AuthReducer';
import { clearSavedToken } from '../../../utils/secureStorage';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
  parseApiError,
} from '../../../utils/apiErrorAlert';
import type {
  SubscriptionPlan,
} from '../../../type/shopOnboarding';
import { formatSubscriptionRs } from '../onboarding/screens/onboardingConstants';

type Props = NativeStackScreenProps<RootStackParamList, 'SelectSubscriptionScreen'>;

const PLAN_LABELS: Record<SubscriptionType, string> = {
  '1month': 'Monthly Plan',
  '3months': 'Quarterly Plan',
  '6months': 'Half-Year Plan',
  '1year': 'Annual Plan',
};

function formatValidityLabel(includedDays: number): string {
  if (includedDays === 30) {
    return 'Valid for 30 days';
  }
  if (includedDays === 90) {
    return 'Valid for 3 months';
  }
  if (includedDays === 180) {
    return 'Valid for 6 months';
  }
  if (includedDays === 360) {
    return 'Valid for 1 year';
  }
  return `Valid for ${includedDays} days`;
}

function getPlanPaymentNote(planType: SubscriptionType): string {
  if (planType === '1month') {
    return 'Subscription invoice will be due after 30 days at the end of your billing cycle.';
  }
  return 'Initial subscription payment is required to continue activation.';
}

export default function SelectSubscriptionScreen({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const authShopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );

  const { loading: plansLoading } = useSelector(
    (state: RootState) => state.shopOnboarding.subscriptionPlans,
  );
  const plans = useSelector(
    (state: RootState) => state.shopOnboarding.subscriptionPlans.data?.subscriptions ?? [],
  );
  const setSubscriptionLoading = useSelector(
    (state: RootState) => state.shopOnboarding.setSubscription.loading,
  );

  const shopId = route.params?.shopId?.trim() || authShopId;
  const [selectedType, setSelectedType] = useState<SubscriptionType | null>(null);
  const [hasLoadedPlans, setHasLoadedPlans] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      await dispatch(fetchSubscriptionPlans_Service()).unwrap();
      setHasLoadedPlans(true);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) {
        return;
      }

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load subscription plans. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadPlans();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadPlans();
    }, [loadPlans]),
  );

  const submitSubscription = useCallback(async () => {
    if (!selectedType || !shopId || setSubscriptionLoading) {
      return;
    }

    try {
      Keyboard.dismiss();
      const response = await dispatch(
        setSubscription_Service({
          shopId,
          subscriptionType: selectedType,
        }),
      ).unwrap();

      dispatch(
        patchLoginShopData({
          subscriptionType: response.subscriptionType,
          status: response.status ?? undefined,
          subscriptionStartDate: response.subscriptionStartDate ?? null,
          nextPaymentDate: response.nextPaymentDate ?? null,
        }),
      );

      if (response.status === 'active') {
        setTimeout(() => {
          show_Alert(
            'success',
            'Activation completed',
            'Activation completed. Please log in to continue using Smart Cost.',
            1,
            false,
            'Login',
            async () => {
              await clearSavedToken();
              dispatch(clearLoginSession());
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
              });
            },
          );
        }, 150);
        return;
      }

      if (response.status === 'subscriptionPaymentPending') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'PayInitialSubscriptionScreen' }],
        });
        return;
      }

      show_Alert(
        'success',
        'Subscription saved',
        response.message || 'Your subscription plan has been saved.',
        1,
        false,
        'OK',
        () => {
          navigation.reset({ index: 0, routes: [{ name: 'PosMain' }] });
        },
      );
    } catch (error: unknown) {
      console.log('error in select subscription screen', parseApiError(error));
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) {
        return;
      }

      show_Alert(
        'error',
        'Error',
        getApiErrorMessage(error, 'Could not save subscription. Please try again.'),
        1,
        false,
        'OK',
        () => {},
      );
    }
  }, [
    dispatch,
    navigation,
    selectedType,
    setSubscriptionLoading,
    shopId,
    show_Alert,
  ]);

  const onContinue = () => {
    if (setSubscriptionLoading) {
      return;
    }

    if (!selectedType) {
      show_Alert(
        'error',
        'Validation',
        'Please select a subscription plan to continue.',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    if (!shopId) {
      show_Alert(
        'error',
        'Error',
        'Shop not found. Please log in again.',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    const selectedPlan = plans.find((plan) => plan.type === selectedType);
    const planLabel = PLAN_LABELS[selectedType] ?? selectedType;
    const planFee = selectedPlan ? formatSubscriptionRs(selectedPlan.fee) : '';

    show_Alert(
      'pending',
      'Confirm subscription',
      planFee
        ? `Are you sure you want to continue with the ${planLabel} (${planFee})?`
        : `Are you sure you want to continue with the ${planLabel}?`,
      2,
      false,
      'Continue',
      () => {
        setTimeout(() => {
          void submitSubscription();
        }, 350);
      },
      'Cancel',
      () => {},
    );
  };

  const showLoader = plansLoading && !hasLoadedPlans;
  const showEmpty = hasLoadedPlans && plans.length === 0;

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Select subscription"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {showLoader ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading subscription plans…
            </Text>
          </View>
        ) : showEmpty ? (
          <View style={styles.centered}>
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
              No subscription plans available
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: paperTheme.colors.primary }]}
              onPress={() => {
                void loadPlans();
              }}
              activeOpacity={0.9}
              disabled={plansLoading}
            >
              {plansLoading ? (
                <ActivityIndicator color={paperTheme.colors.onPrimary} />
              ) : (
                <Text style={[styles.retryButtonText, { color: paperTheme.colors.onPrimary }]}>
                  Retry
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.scrollContent,
                selectedType != null && styles.scrollWithFooter,
              ]}
            >
              <Text style={[styles.heading, { color: paperTheme.colors.onSurface }]}>
                Choose your plan
              </Text>
              <Text style={[styles.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>
                Select a subscription to continue using Smart Cost after your upfront payment.
              </Text>

              {plans.map((plan: SubscriptionPlan) => {
                const planType = plan.type as SubscriptionType;
                const isSelected = selectedType === planType;
                const perMonthPrice =
                  plan.includedDays > 30
                    ? Math.round(plan.fee / (plan.includedDays / 30))
                    : undefined;
                const isBestValue = planType === '1year';

                return (
                  <TouchableOpacity
                    key={plan.type}
                    activeOpacity={0.9}
                    onPress={() => setSelectedType(planType)}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: paperTheme.colors.surface,
                        borderColor: isSelected
                          ? paperTheme.colors.primary
                          : paperTheme.colors.outline,
                      },
                      isSelected && {
                        borderWidth: 2,
                        backgroundColor: paperTheme.colors.primaryContainer,
                      },
                    ]}
                  >
                    <View style={styles.planHeader}>
                      <View style={styles.planTitleRow}>
                        <Text style={[styles.planTitle, { color: paperTheme.colors.onSurface }]}>
                          {PLAN_LABELS[planType] ?? plan.type}
                        </Text>
                        {isBestValue ? (
                          <View
                            style={[
                              styles.bestValueBadge,
                              { backgroundColor: paperTheme.colors.primary },
                            ]}
                          >
                            <Text
                              style={[
                                styles.bestValueText,
                                { color: paperTheme.colors.onPrimary },
                              ]}
                            >
                              Best Value
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          {
                            borderColor: isSelected
                              ? paperTheme.colors.primary
                              : paperTheme.colors.outline,
                          },
                        ]}
                      >
                        {isSelected ? (
                          <View
                            style={[
                              styles.radioInner,
                              { backgroundColor: paperTheme.colors.primary },
                            ]}
                          />
                        ) : null}
                      </View>
                    </View>

                    <Text style={[styles.totalPrice, { color: paperTheme.colors.onSurface }]}>
                      {formatSubscriptionRs(plan.fee)}
                    </Text>

                    {perMonthPrice != null ? (
                      <Text
                        style={[
                          styles.perMonthPrice,
                          { color: paperTheme.colors.onSurfaceVariant },
                        ]}
                      >
                        {formatSubscriptionRs(perMonthPrice)}/month
                      </Text>
                    ) : null}

                    {plan.saveAmount > 0 ? (
                      <View
                        style={[
                          styles.savingsBadge,
                          {
                            backgroundColor:
                              resolvedTheme === 'dark' ? 'rgba(34, 197, 94, 0.18)' : '#ecfdf3',
                          },
                        ]}
                      >
                        <Text style={styles.savingsText}>
                          Save {formatSubscriptionRs(plan.saveAmount)}
                        </Text>
                      </View>
                    ) : null}

                    <Text
                      style={[styles.validityLabel, { color: paperTheme.colors.onSurfaceVariant }]}
                    >
                      {formatValidityLabel(plan.includedDays)}
                    </Text>

                    <Text
                      style={[
                        styles.planPaymentNote,
                        {
                          color:
                            planType === '1month'
                              ? paperTheme.colors.onSurfaceVariant
                              : resolvedTheme === 'dark'
                                ? '#fbbf24'
                                : '#b45309',
                        },
                      ]}
                    >
                      {getPlanPaymentNote(planType)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedType != null ? (
              <View
                style={[
                  styles.footer,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    { backgroundColor: paperTheme.colors.primary },
                    setSubscriptionLoading && styles.continueButtonDisabled,
                  ]}
                  onPress={onContinue}
                  activeOpacity={0.9}
                  disabled={setSubscriptionLoading}
                >
                  {setSubscriptionLoading ? (
                    <ActivityIndicator color={paperTheme.colors.onPrimary} />
                  ) : (
                    <Text style={[styles.continueButtonText, { color: paperTheme.colors.onPrimary }]}>
                      Continue
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </SafeAreaView>

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
          closeOnBackdropPress={false}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 48,
    minWidth: 140,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  retryButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  scrollWithFooter: {
    paddingBottom: 120,
  },
  heading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  planTitleRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  planTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  bestValueBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bestValueText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  totalPrice: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 4,
  },
  perMonthPrice: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  savingsText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    color: '#15803d',
  },
  validityLabel: {
    fontFamily: fonts.InterRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  planPaymentNote: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  continueButton: {
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.75,
  },
  continueButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
});
