import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import { fonts } from '../../../constants/fonts';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { SubscriptionType } from '../../../type/onboarding';
import {
  fetchSubscriptionPlans_Service,
  selectNewSubscription_Service,
} from '../../../services/ShopOnboardingService';
import { AppDispatch, RootState } from '../../../store/store';
import { clearLoginSession, patchLoginShopData } from '../../../store/reducers/AuthReducer';
import { clearSavedToken } from '../../../utils/secureStorage';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
  parseApiError,
} from '../../../utils/apiErrorAlert';
import type { SubscriptionPlan } from '../../../type/shopOnboarding';
import { formatSubscriptionRs } from '../onboarding/screens/onboardingConstants';
import { cardShadow } from '../../settings/shared/settingsDetailStyles';

const MULTI_MONTH_SUBSCRIPTION_TYPES: SubscriptionType[] = ['3months', '6months', '1year'];

type Props = NativeStackScreenProps<RootStackParamList, 'ChangeSubscriptionPlanScreen'>;

const PLAN_LABELS: Record<SubscriptionType, string> = {
  '1month': 'Monthly Plan',
  '3months': 'Quarterly Plan',
  '6months': 'Half-Year Plan',
  '1year': 'Annual Plan',
};

const PLAN_ICONS: Record<SubscriptionType, keyof typeof Ionicons.glyphMap> = {
  '1month': 'calendar-outline',
  '3months': 'calendar-number-outline',
  '6months': 'albums-outline',
  '1year': 'trophy-outline',
};

function formatValidityLabel(includedDays: number): string {
  if (includedDays === 30) return 'Valid for 30 days';
  if (includedDays === 90) return 'Valid for 3 months';
  if (includedDays === 180) return 'Valid for 6 months';
  if (includedDays === 360) return 'Valid for 1 year';
  return `Valid for ${includedDays} days`;
}

function getPlanPaymentNote(planType: SubscriptionType): string {
  if (planType === '1month') {
    return 'Billing continues on your monthly cycle after activation.';
  }
  return 'Pay the new plan invoice within 14 days to complete your subscription change.';
}

export default function ChangeSubscriptionPlanScreen({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const authShopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );
  const currentSubscriptionType = useSelector(
    (state: RootState) => state.AuthReducer.Login.shopData?.subscriptionType ?? null,
  );

  const { loading: plansLoading } = useSelector(
    (state: RootState) => state.shopOnboarding.subscriptionPlans,
  );
  const plans = useSelector(
    (state: RootState) => state.shopOnboarding.subscriptionPlans.data?.subscriptions ?? [],
  );
  const selectNewSubscriptionLoading = useSelector(
    (state: RootState) => state.shopOnboarding.selectNewSubscription.loading,
  );

  const shopId = route.params?.shopId?.trim() || authShopId;
  const [selectedType, setSelectedType] = useState<SubscriptionType | null>(null);
  const [hasLoadedPlans, setHasLoadedPlans] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      await dispatch(fetchSubscriptionPlans_Service()).unwrap();
      setHasLoadedPlans(true);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPlans();
    } finally {
      setRefreshing(false);
    }
  }, [loadPlans]);

  const currentPlanLabel = useMemo(() => {
    if (!currentSubscriptionType) return null;
    return PLAN_LABELS[currentSubscriptionType as SubscriptionType] ?? currentSubscriptionType;
  }, [currentSubscriptionType]);

  const navigateToLogin = useCallback(async () => {
    await clearSavedToken();
    dispatch(clearLoginSession());
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoginScreen' }],
    });
  }, [dispatch, navigation]);

  const submitSubscription = useCallback(async () => {
    if (!selectedType || !shopId || selectNewSubscriptionLoading) {
      return;
    }

    try {
      Keyboard.dismiss();
      const response = await dispatch(
        selectNewSubscription_Service({
          subscriptionType: selectedType,
        }),
      ).unwrap();

      dispatch(
        patchLoginShopData({
          subscriptionType: response.subscriptionType,
          status: response.status ?? undefined,
          nextPaymentDate: response.nextPaymentDate ?? null,
          subscriptionReceiptNo: response.subscriptionReceiptNo ?? null,
          subscriptionDueDays: response.subscriptionDueDays ?? undefined,
        }),
      );

      if (response.status === 'active' && selectedType === '1month') {
        setTimeout(() => {
          show_Alert(
            'success',
            'Plan selected',
            'Subscription plan is selected. Done. Please login again.',
            1,
            false,
            'Login',
            () => {
              void navigateToLogin();
            },
          );
        }, 150);
        return;
      }

      if (
        response.status === 'due' &&
        response.payment &&
        MULTI_MONTH_SUBSCRIPTION_TYPES.includes(selectedType)
      ) {
        const planLabel = PLAN_LABELS[selectedType];
        const receiptNumber = response.payment.receiptNumber ?? '';
        const amountLabel =
          response.payment.paymentAmount != null
            ? formatSubscriptionRs(response.payment.paymentAmount)
            : '';
        const smsNote =
          response.smsSent === false
            ? '\n\nWe could not send an SMS to your registered mobile number. Please check Payments after you log in.'
            : '';

        setTimeout(() => {
          show_Alert(
            'success',
            'Invoice sent',
            `Your ${planLabel} subscription invoice${receiptNumber ? ` (${receiptNumber})` : ''}${amountLabel ? ` for ${amountLabel}` : ''} has been sent. Please complete payment within 14 days.${smsNote}`,
            1,
            false,
            'Login',
            () => {
              void navigateToLogin();
            },
          );
        }, 150);
        return;
      }

      show_Alert(
        'success',
        'Plan updated',
        response.message || 'Your subscription plan has been updated.',
        1,
        false,
        'OK',
        () => {},
      );
    } catch (error: unknown) {
      console.log('error in change subscription plan screen', parseApiError(error));
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Update failed',
        getApiErrorMessage(error, 'Could not update subscription. Please try again.'),
        1,
        false,
        'OK',
        () => {},
      );
    }
  }, [
    dispatch,
    navigateToLogin,
    navigation,
    plans,
    selectedType,
    selectNewSubscriptionLoading,
    shopId,
    show_Alert,
  ]);

  const onUpdatePlan = () => {
    if (selectNewSubscriptionLoading) return;

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
      'Confirm plan change',
      planFee
        ? `Are you sure you want to continue with ${planLabel} (${planFee})?`
        : `Are you sure you want to continue with ${planLabel}?`,
      2,
      false,
      'Yes',
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
          title="Change subscription"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
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
              onPress={() => void loadPlans()}
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
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void onRefresh()}
                  tintColor={paperTheme.colors.primary}
                  colors={[paperTheme.colors.primary]}
                />
              }
              contentContainerStyle={[
                styles.scrollContent,
                selectedType != null && styles.scrollWithFooter,
              ]}
            >
              <View
                style={[
                  styles.banner,
                  {
                    backgroundColor:
                      resolvedTheme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                    borderColor: '#3b82f6',
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <Ionicons name="swap-horizontal-outline" size={22} color="#2563eb" />
                <View style={styles.bannerBody}>
                  <Text style={[styles.bannerTitle, { color: '#1d4ed8' }]}>
                    Select your new plan
                  </Text>
                  <Text style={[styles.bannerText, { color: '#1e40af' }]}>
                    Your previous subscription payment was approved. Choose a new package below
                    and tap Update plan to continue.
                  </Text>
                  {currentPlanLabel ? (
                    <Text style={[styles.currentPlanText, { color: '#1e3a8a' }]}>
                      Previous plan: {currentPlanLabel}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Text style={[styles.heading, { color: paperTheme.colors.onSurface }]}>
                Available packages
              </Text>
              <Text style={[styles.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>
                Tap a plan to select it, then confirm with Update plan.
              </Text>

              {plans.map((plan: SubscriptionPlan) => {
                const planType = plan.type as SubscriptionType;
                const isSelected = selectedType === planType;
                const isCurrentPlan = currentSubscriptionType === planType;
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
                          : paperTheme.colors.outlineVariant,
                      },
                      isSelected && {
                        borderWidth: 2,
                        backgroundColor: paperTheme.colors.primaryContainer,
                      },
                      cardShadow(resolvedTheme),
                    ]}
                  >
                    <View style={styles.planHeader}>
                      <View style={styles.planTitleBlock}>
                        <View
                          style={[
                            styles.planIconWrap,
                            {
                              backgroundColor: isSelected
                                ? paperTheme.colors.primary
                                : paperTheme.colors.primaryContainer,
                            },
                          ]}
                        >
                          <Ionicons
                            name={PLAN_ICONS[planType]}
                            size={20}
                            color={
                              isSelected
                                ? paperTheme.colors.onPrimary
                                : paperTheme.colors.primary
                            }
                          />
                        </View>
                        <View style={styles.planTitleTextBlock}>
                          <Text style={[styles.planTitle, { color: paperTheme.colors.onSurface }]}>
                            {PLAN_LABELS[planType] ?? plan.type}
                          </Text>
                          {isCurrentPlan ? (
                            <Text
                              style={[
                                styles.currentBadge,
                                { color: paperTheme.colors.onSurfaceVariant },
                              ]}
                            >
                              Previous selection
                            </Text>
                          ) : null}
                        </View>
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

                    <View style={styles.priceRow}>
                      <Text style={[styles.totalPrice, { color: paperTheme.colors.onSurface }]}>
                        {formatSubscriptionRs(plan.fee)}
                      </Text>
                      {isBestValue ? (
                        <View
                          style={[
                            styles.bestValueBadge,
                            { backgroundColor: paperTheme.colors.primary },
                          ]}
                        >
                          <Text
                            style={[styles.bestValueText, { color: paperTheme.colors.onPrimary }]}
                          >
                            Best value
                          </Text>
                        </View>
                      ) : null}
                    </View>

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
                  cardShadow(resolvedTheme),
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.updateButton,
                    { backgroundColor: paperTheme.colors.primary },
                    selectNewSubscriptionLoading && styles.updateButtonDisabled,
                  ]}
                  onPress={onUpdatePlan}
                  activeOpacity={0.9}
                  disabled={selectNewSubscriptionLoading}
                >
                  {selectNewSubscriptionLoading ? (
                    <ActivityIndicator color={paperTheme.colors.onPrimary} />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color={paperTheme.colors.onPrimary}
                      />
                      <Text style={[styles.updateButtonText, { color: paperTheme.colors.onPrimary }]}>
                        Update plan
                      </Text>
                    </>
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
  banner: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
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
  currentPlanText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginTop: 8,
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
    marginBottom: 16,
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
    marginBottom: 12,
  },
  planTitleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitleTextBlock: {
    flex: 1,
  },
  planTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  currentBadge: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginTop: 2,
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  totalPrice: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 24,
    lineHeight: 30,
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
  updateButton: {
    borderRadius: 14,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  updateButtonDisabled: {
    opacity: 0.75,
  },
  updateButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
});
