import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import { fonts } from '../../../../constants/fonts';
import { fetchSubscriptionPlans_Service } from '../../../../services/ShopOnboardingService';
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

  const plansLoading = useSelector(
    (state: RootState) => state.shopOnboarding.subscriptionPlans.loading,
  );
  const plans = useSelector(
    (state: RootState) =>
      state.shopOnboarding.subscriptionPlans.data?.subscriptions ?? [],
  );
  const currentSubscriptionType = useSelector((state: RootState) => {
    const shop = state.AuthReducer.Login.shopData;
    const value = shop?.subscriptionType;
    return typeof value === 'string' ? value : null;
  });

  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlans = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      }
      try {
        await dispatch(fetchSubscriptionPlans_Service()).unwrap();
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
      } finally {
        setRefreshing(false);
      }
    },
    [dispatch, show_Alert],
  );

  useFocusEffect(
    useCallback(() => {
      void loadPlans();
    }, [loadPlans]),
  );

  const primary = paperTheme.colors.primary;
  const showLoader = plansLoading && !hasLoaded;
  const showEmpty = hasLoaded && plans.length === 0;

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
          title="Change subscription"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {showLoader ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading subscription plans…
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
                  void loadPlans(true);
                }}
                tintColor={primary}
                colors={[primary]}
              />
            }
          >
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
                    backgroundColor:
                      resolvedTheme === 'dark' ? '#052e16' : '#f0fdf4',
                    borderColor: '#86efac',
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#15803d" />
                <Text style={[styles.currentBannerText, { color: '#166534' }]}>
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
                          backgroundColor:
                            resolvedTheme === 'dark'
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
