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
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../../store/store';
import { patchLoginShopData } from '../../../../store/reducers/AuthReducer';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import { fonts } from '../../../../constants/fonts';
import {
  cancelSubscriptionChangePending_Service,
  createSubscriptionChangePending_Service,
  fetchSubscriptionChangePending_Service,
  fetchSubscriptionPlans_Service,
} from '../../../../services/ShopOnboardingService';
import type { SubscriptionPlan } from '../../../../type/shopOnboarding';
import { SubscriptionType } from '../../../../type/onboarding';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../utils/apiErrorAlert';
import { cardShadow } from '../../shared/settingsDetailStyles';
import { SettingsEmptyState } from '../../shared/SettingsDetailComponents';
import { formatSubscriptionRs } from '../../../loginScreens/onboarding/screens/onboardingConstants';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangeSubscription'>;

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

export default function ChangeSubscriptionScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const isDark = resolvedTheme === 'dark';

  const plansLoading = useSelector(
    (state: RootState) => state.shopOnboarding.subscriptionPlans.loading,
  );
  const plans = useSelector(
    (state: RootState) =>
      state.shopOnboarding.subscriptionPlans.data?.subscriptions ?? [],
  );
  const shop = useSelector((state: RootState) => state.AuthReducer.Login.shopData);
  const currentSubscriptionType =
    typeof shop?.subscriptionType === 'string' ? shop.subscriptionType : null;

  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isPending, setIsPending] = useState(
    shop?.isSubscriptionChangePending === true,
  );
  const [actionLoading, setActionLoading] = useState(false);

  const refreshScreen = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      }

      try {
        const [pendingResponse] = await Promise.all([
          dispatch(fetchSubscriptionChangePending_Service()).unwrap(),
          dispatch(fetchSubscriptionPlans_Service()).unwrap(),
        ]);

        const pending = pendingResponse.isSubscriptionChangePending === true;
        setIsPending(pending);
        dispatch(patchLoginShopData({ isSubscriptionChangePending: pending }));
        setHasLoaded(true);
      } catch (error: unknown) {
        const handled = await handleSessionExpiredApiError(error, show_Alert);
        if (handled) {
          return;
        }
        setTimeout(() => {
          show_Alert(
            'error',
            'Load failed',
            getApiErrorMessage(error, 'Could not load subscription details. Please try again.'),
            2,
            false,
            'Retry',
            () => {
              void refreshScreen();
            },
            'Cancel',
            () => {},
          );
        }, 150);
      } finally {
        setRefreshing(false);
      }
    },
    [dispatch, show_Alert],
  );

  useFocusEffect(
    useCallback(() => {
      void refreshScreen();
    }, [refreshScreen]),
  );

  const confirmSchedulePending = useCallback(() => {
    show_Alert(
      'pending',
      'Schedule plan change?',
      'Do you want to schedule a pending subscription change for the next billing cycle?',
      2,
      false,
      'Schedule',
      () => {
        setTimeout(() => {
          void (async () => {
            setActionLoading(true);
            try {
              const response = await dispatch(
                createSubscriptionChangePending_Service(),
              ).unwrap();
              const pending = response.isSubscriptionChangePending === true;
              setIsPending(pending);
              dispatch(patchLoginShopData({ isSubscriptionChangePending: pending }));
              await refreshScreen(true);
              setTimeout(() => {
                show_Alert(
                  'success',
                  'Scheduled',
                  response.message ||
                    'Your subscription change request is pending for the next cycle.',
                  1,
                  false,
                  'OK',
                  () => {},
                );
              }, 150);
            } catch (error: unknown) {
              const handled = await handleSessionExpiredApiError(error, show_Alert);
              if (handled) {
                return;
              }
              setTimeout(() => {
                show_Alert(
                  'error',
                  'Schedule failed',
                  getApiErrorMessage(
                    error,
                    'Could not schedule subscription change. Please try again.',
                  ),
                  1,
                  false,
                  'OK',
                  () => {},
                );
              }, 150);
            } finally {
              setActionLoading(false);
            }
          })();
        }, 350);
      },
      'Cancel',
      () => {},
    );
  }, [dispatch, refreshScreen, show_Alert]);

  const confirmCancelPending = useCallback(() => {
    show_Alert(
      'error',
      'Cancel pending request?',
      'Do you want to cancel the scheduled subscription change for the next billing cycle?',
      2,
      false,
      'Cancel request',
      () => {
        setTimeout(() => {
          void (async () => {
            setActionLoading(true);
            try {
              const response = await dispatch(
                cancelSubscriptionChangePending_Service(),
              ).unwrap();
              const pending = response.isSubscriptionChangePending === true;
              setIsPending(pending);
              dispatch(patchLoginShopData({ isSubscriptionChangePending: pending }));
              await refreshScreen(true);
              setTimeout(() => {
                show_Alert(
                  'success',
                  'Cancelled',
                  response.message || 'Pending subscription change has been cancelled.',
                  1,
                  false,
                  'OK',
                  () => {},
                );
              }, 150);
            } catch (error: unknown) {
              const handled = await handleSessionExpiredApiError(error, show_Alert);
              if (handled) {
                return;
              }
              setTimeout(() => {
                show_Alert(
                  'error',
                  'Cancel failed',
                  getApiErrorMessage(
                    error,
                    'Could not cancel the pending request. Please try again.',
                  ),
                  1,
                  false,
                  'OK',
                  () => {},
                );
              }, 150);
            } finally {
              setActionLoading(false);
            }
          })();
        }, 350);
      },
      'Keep pending',
      () => {},
    );
  }, [dispatch, refreshScreen, show_Alert]);

  const primary = paperTheme.colors.primary;
  const showLoader = (plansLoading || !hasLoaded) && !refreshing;
  const showEmpty = hasLoaded && plans.length === 0;

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Change subscription"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {showLoader ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading subscription details…
            </Text>
          </View>
        ) : showEmpty ? (
          <SettingsEmptyState
            icon="card-outline"
            title="No plans available"
            description="Subscription plans could not be loaded. Pull to refresh or try again later."
            paperTheme={paperTheme}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void refreshScreen(true);
                }}
                tintColor={primary}
                colors={[primary]}
              />
            }
          >
            {isPending ? (
              <View
                style={[
                  styles.pendingCard,
                  {
                    backgroundColor: isDark ? '#422006' : '#fffbeb',
                    borderColor: '#f59e0b',
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <View
                  style={[
                    styles.pendingIconRing,
                    { backgroundColor: isDark ? '#78350f' : '#fef3c7' },
                  ]}
                >
                  <Ionicons name="time-outline" size={26} color="#b45309" />
                </View>
                <Text style={[styles.pendingTitle, { color: isDark ? '#fde68a' : '#92400e' }]}>
                  Pending plan change
                </Text>
                <Text
                  style={[styles.pendingBody, { color: isDark ? '#fcd34d' : '#a16207' }]}
                >
                  A subscription change request is already scheduled for your next billing
                  cycle. You can cancel it anytime before that cycle starts.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.cancelPendingBtn,
                    {
                      borderColor: '#fca5a5',
                      backgroundColor: isDark ? '#450a0a' : '#fef2f2',
                      opacity: actionLoading ? 0.7 : 1,
                    },
                  ]}
                  onPress={confirmCancelPending}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#dc2626" />
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
                      <Text style={styles.cancelPendingBtnText}>Cancel pending request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.scheduleCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <View
                  style={[
                    styles.pendingIconRing,
                    { backgroundColor: paperTheme.colors.primaryContainer },
                  ]}
                >
                  <Ionicons name="swap-horizontal-outline" size={26} color={primary} />
                </View>
                <Text style={[styles.pendingTitle, { color: paperTheme.colors.onSurface }]}>
                  Change plan on next cycle
                </Text>
                <Text
                  style={[
                    styles.pendingBody,
                    { color: paperTheme.colors.onSurfaceVariant },
                  ]}
                >
                  Schedule a pending subscription change. Your current plan stays active
                  until the next billing cycle.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.scheduleBtn,
                    { backgroundColor: primary, opacity: actionLoading ? 0.7 : 1 },
                  ]}
                  onPress={confirmSchedulePending}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="calendar-outline" size={18} color="#fff" />
                      <Text style={styles.scheduleBtnText}>Schedule pending change</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.heading, { color: paperTheme.colors.onSurface }]}>
              Available plans
            </Text>
            <Text style={[styles.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>
              Compare subscription options for your shop. Prices are shown in Sri Lankan Rupees.
            </Text>

            {currentSubscriptionType ? (
              <View
                style={[
                  styles.currentBanner,
                  {
                    backgroundColor: isDark ? '#052e16' : '#f0fdf4',
                    borderColor: '#86efac',
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#15803d" />
                <Text style={[styles.currentBannerText, { color: isDark ? '#bbf7d0' : '#166534' }]}>
                  Current plan:{' '}
                  {PLAN_LABELS[currentSubscriptionType as SubscriptionType] ??
                    currentSubscriptionType}
                </Text>
              </View>
            ) : null}

            {plans.map((plan: SubscriptionPlan) => {
              const planType = plan.type as SubscriptionType;
              const isCurrent = currentSubscriptionType === plan.type;
              const isBestValue = planType === '1year';
              const perMonthPrice =
                plan.includedDays > 30
                  ? Math.round(plan.fee / (plan.includedDays / 30))
                  : undefined;

              return (
                <View
                  key={plan.type}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: paperTheme.colors.surface,
                      borderColor: isCurrent
                        ? primary
                        : paperTheme.colors.outlineVariant,
                    },
                    isCurrent && { borderWidth: 2 },
                    cardShadow(resolvedTheme),
                  ]}
                >
                  <View style={styles.planTop}>
                    <View
                      style={[
                        styles.planIconRing,
                        { backgroundColor: paperTheme.colors.primaryContainer },
                      ]}
                    >
                      <Ionicons
                        name={PLAN_ICONS[planType] ?? 'card-outline'}
                        size={22}
                        color={primary}
                      />
                    </View>

                    <View style={styles.planTitleBlock}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[styles.planTitle, { color: paperTheme.colors.onSurface }]}
                        >
                          {PLAN_LABELS[planType] ?? plan.type}
                        </Text>
                        {isBestValue ? (
                          <View style={[styles.badge, { backgroundColor: primary }]}>
                            <Text
                              style={[
                                styles.badgeText,
                                { color: paperTheme.colors.onPrimary },
                              ]}
                            >
                              Best value
                            </Text>
                          </View>
                        ) : null}
                        {isCurrent ? (
                          <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                            <Text style={[styles.badgeText, { color: '#15803d' }]}>
                              Current
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.validity,
                          { color: paperTheme.colors.onSurfaceVariant },
                        ]}
                      >
                        {formatValidityLabel(plan.includedDays)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.fee, { color: paperTheme.colors.onSurface }]}>
                    {formatSubscriptionRs(plan.fee)}
                  </Text>

                  {perMonthPrice != null ? (
                    <Text
                      style={[
                        styles.perMonth,
                        { color: paperTheme.colors.onSurfaceVariant },
                      ]}
                    >
                      {formatSubscriptionRs(perMonthPrice)} / month
                    </Text>
                  ) : null}

                  {plan.saveAmount > 0 ? (
                    <View
                      style={[
                        styles.saveChip,
                        {
                          backgroundColor: isDark
                            ? 'rgba(34, 197, 94, 0.18)'
                            : '#ecfdf3',
                        },
                      ]}
                    >
                      <Ionicons name="pricetag-outline" size={14} color="#15803d" />
                      <Text style={styles.saveChipText}>
                        Save {formatSubscriptionRs(plan.saveAmount)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>

      {alertConfig ? (
        <Portal>
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
        </Portal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
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
  pendingCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  scheduleCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  pendingIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pendingTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    marginBottom: 6,
  },
  pendingBody: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  scheduleBtn: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scheduleBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    color: '#fff',
  },
  cancelPendingBtn: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelPendingBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    color: '#dc2626',
  },
  heading: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
    marginBottom: 4,
  },
  subheading: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  currentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  currentBannerText: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  planIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitleBlock: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  planTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
  },
  validity: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  fee: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 22,
  },
  perMonth: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginTop: 2,
  },
  saveChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  saveChipText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    color: '#15803d',
  },
});
