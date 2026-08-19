import React, { useCallback } from 'react';
import {
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
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../../context/ThemeContext';
import { useDummySession } from '../../../context/DummySessionContext';
import { AppDispatch, RootState } from '../../../store/store';
import { clearLoginSession, setLoginSession } from '../../../store/reducers/AuthReducer';
import { clearSavedToken } from '../../../utils/secureStorage';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import type { LoginShop } from '../../../type/auth';
import { cardShadow, settingsMenuStyles as styles } from '../shared/settingsDetailStyles';
import { fonts } from '../../../constants/fonts';
import { fetchSettingsData_Service } from '../../../services/SettingsService';
import { useShopIndustry } from '../../../hooks/useShopIndustry';
import { hasKitchenOrders, hasTableManagement } from '../../../utils/industryHelper';
import { hasQuotationsModule, resolveQuotationsModule } from '../../../utils/featureHelper';
import { handleSessionExpiredApiError } from '../../../utils/apiErrorAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function formatTrialEndDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return '—';
  }
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return String(isoDate);
  }
  return parsed.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatShopDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return '—';
  }
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return String(isoDate);
  }
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getSubscriptionBadge(shop: LoginShop | null | undefined) {
  const status = shop?.status;

  if (status === 'active') {
    return {
      label: 'Subscribed',
      bg: '#dcfce7',
      color: '#15803d',
    };
  }

  if (status === 'trial') {
    return {
      label: 'Trial',
      bg: '#fef3c7',
      color: '#b45309',
    };
  }

  if (status === 'due') {
    return {
      label: 'Due',
      bg: '#fee2e2',
      color: '#b91c1c',
    };
  }

  return null;
}

type MenuItem = {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
  danger?: boolean;
  comingSoon?: boolean;
};

function SettingsMenuGroup({
  label,
  items,
  paperTheme,
  resolvedTheme,
}: {
  label: string;
  items: MenuItem[];
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  return (
    <>
      <Text
        style={[styles.menuSectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.menuGroup,
          {
            backgroundColor: paperTheme.colors.surface,
            borderColor: paperTheme.colors.outlineVariant,
          },
          cardShadow(resolvedTheme),
        ]}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.key}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <View style={styles.cardBody}>
                <View style={moduleStyles.titleRow}>
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color: item.danger
                          ? '#dc2626'
                          : paperTheme.colors.onSurface,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.comingSoon ? (
                    <View
                      style={[
                        moduleStyles.soonBadge,
                        { backgroundColor: paperTheme.colors.tertiaryContainer },
                      ]}
                    >
                      <Text
                        style={[
                          moduleStyles.soonBadgeText,
                          { color: paperTheme.colors.tertiary },
                        ]}
                      >
                        Soon
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[styles.cardDesc, { color: paperTheme.colors.onSurfaceVariant }]}
                >
                  {item.description}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={paperTheme.colors.outline}
              />
            </TouchableOpacity>
            {index < items.length - 1 ? (
              <View
                style={[
                  styles.menuDivider,
                  { backgroundColor: paperTheme.colors.outlineVariant },
                ]}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { logoutSession } = useDummySession();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const user = useSelector((state: RootState) => state.AuthReducer.Login.userData);
  const shop = useSelector((state: RootState) => state.AuthReducer.Login.shopData);
  const { shop: industryShop } = useShopIndustry();

  const primary = paperTheme.colors.primary;
  const displayName = user?.name ?? 'User';
  const displayRole = user?.role ?? 'staff';
  const shopLabel = shop?.shopName?.trim() || shop?.shopId || 'No shop linked';
  const subscriptionBadge = getSubscriptionBadge(shop);
  const showManageUsers = displayRole === 'owner';
  const showChangeSubscription = displayRole !== 'staff' && shop?.status !== 'trial';
  const isTrialShop = shop?.status === 'trial';
  const showKpiModule = shop?.kpi === true;
  const showAnalyticsModule = shop?.analyticsModule === true;
  const showCostModule = shop?.costModule === true;
  const showMarketingModule = shop?.marketingModule === true && !isTrialShop;
  const showQuotationsModule = hasQuotationsModule(shop);
  const showManageTables =
    (displayRole === 'owner' || displayRole === 'admin') && hasTableManagement(industryShop ?? shop);
  const showKitchenPrinter = hasKitchenOrders(industryShop ?? shop);
  const isSubscriptionChangePending = shop?.isSubscriptionChangePending === true;

  const refreshSettingsData = useCallback(async () => {
    try {
      const response = await dispatch(fetchSettingsData_Service()).unwrap();
      dispatch(
        setLoginSession({
          user: response.user,
          shop: response.shop
            ? {
                ...response.shop,
                quotationsModule: resolveQuotationsModule(response.shop),
              }
            : null,
        }),
      );
    } catch (error: unknown) {
      await handleSessionExpiredApiError(error, show_Alert);
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void refreshSettingsData();
    }, [refreshSettingsData]),
  );

  const showComingSoonAlert = (moduleName: string) => {
    show_Alert(
      'pending',
      'Coming soon',
      `${moduleName} will be available in a future release.`,
      1,
      false,
      'OK',
      () => {},
    );
  };

  const confirmLogout = () => {
    show_Alert(
      'error',
      'Log out',
      'Are you sure you want to log out?',
      2,
      false,
      'Log out',
      async () => {
        await clearSavedToken();
        dispatch(clearLoginSession());
        logoutSession();
      },
      'Cancel',
      () => {},
    );
  };

  const goToPos = () => {
    navigation.reset({ index: 0, routes: [{ name: 'PosMain' }] });
  };

  const goToCostManagement = () => {
    navigation.reset({ index: 0, routes: [{ name: 'CostDashboard' }] });
  };

  const accountItems: MenuItem[] = [
    {
      key: 'profile',
      title: 'Profile details',
      description: 'Your name, phone, email & role',
      icon: 'person-outline',
      iconBg: paperTheme.colors.secondaryContainer,
      iconColor: paperTheme.colors.secondary,
      onPress: () => navigation.navigate('ProfileDetails'),
    },
    {
      key: 'shop',
      title: 'Shop details',
      description: 'Shop, owner & subscription info',
      icon: 'storefront-outline',
      iconBg: paperTheme.colors.primaryContainer,
      iconColor: primary,
      onPress: () => navigation.navigate('ShopDetails'),
    },
  ];

  const paymentAndFeatureItems: MenuItem[] = [
    {
      key: 'printer',
      title: 'Receipt printer',
      description: 'Cashier receipts — network (LAN) or USB',
      icon: 'print-outline',
      iconBg: '#ecfdf5',
      iconColor: '#047857',
      onPress: () => navigation.navigate('PrinterConnection', { printerRole: 'receipt' }),
    },
    ...(showKitchenPrinter
      ? [
          {
            key: 'kitchen-printer',
            title: 'Kitchen printer',
            description: 'KOT tickets for kitchen — network (LAN)',
            icon: 'flame-outline' as const,
            iconBg: '#ffedd5',
            iconColor: '#c2410c',
            onPress: () => navigation.navigate('PrinterConnection', { printerRole: 'kitchen' }),
          },
        ]
      : []),
    ...(showManageUsers
      ? [
          {
            key: 'manage',
            title: 'Manage accounts',
            description: 'Admins & staff for your shop',
            icon: 'people-outline' as const,
            iconBg: paperTheme.colors.tertiaryContainer,
            iconColor: paperTheme.colors.tertiary,
            onPress: () => navigation.navigate('ManageAccount'),
          },
        ]
      : []),
    ...(showChangeSubscription
      ? [
          {
            key: 'change-subscription',
            title: 'Change subscription',
            description: isSubscriptionChangePending
              ? 'Pending next-cycle plan change scheduled'
              : 'View plans & schedule a change for next cycle',
            icon: 'swap-horizontal-outline' as const,
            iconBg: '#fef3c7',
            iconColor: '#b45309',
            onPress: () => navigation.navigate('ChangeSubscription'),
          },
        ]
      : []),
    {
      key: 'payments',
      title: 'Payment',
      description: 'Payment history & current status',
      icon: 'card-outline',
      iconBg: '#dbeafe',
      iconColor: '#1d4ed8',
      onPress: () => navigation.navigate('SubscriptionPayments'),
    },
    ...(displayRole === 'owner'
      ? [
          {
            key: 'manage-features',
            title: 'Manage features',
            description: 'SMS, KPI, analytics & other shop modules',
            icon: 'options-outline' as const,
            iconBg: '#e0f2fe',
            iconColor: '#0284c7',
            onPress: () => navigation.navigate('ManageFeatures'),
          },
        ]
      : []),
    ...(showManageTables
      ? [
          {
            key: 'manage-tables',
            title: 'Manage tables',
            description: 'Set up dine-in tables for this branch',
            icon: 'restaurant-outline' as const,
            iconBg: '#fef3c7',
            iconColor: '#b45309',
            onPress: () => navigation.navigate('ManageTables'),
          },
        ]
      : []),
  ];

  const moduleItems: MenuItem[] = [
    {
      key: 'pos',
      title: 'POS System',
      description: 'Sales counter, cart, checkout & inventory',
      icon: 'cart-outline',
      iconBg: paperTheme.colors.primaryContainer,
      iconColor: primary,
      onPress: goToPos,
    },
    ...(showCostModule
      ? [
          {
            key: 'cost',
            title: 'Cost Management',
            description: 'Track spending, margins & financial insights',
            icon: 'calculator-outline' as const,
            iconBg: '#ede9fe',
            iconColor: '#6d28d9',
            onPress: goToCostManagement,
          },
        ]
      : []),
    ...(showAnalyticsModule
      ? [
          {
            key: 'analytics',
            title: 'Analytics',
            description: 'Sales, costs, profit & business insights',
            icon: 'analytics-outline' as const,
            iconBg: '#ccfbf1',
            iconColor: '#0f766e',
            onPress: () => navigation.navigate('Analytics'),
          },
        ]
      : []),
    ...(showKpiModule
      ? [
          {
            key: 'kpi',
            title: 'Key Performance Indicators',
            description: 'KPI dashboard, metrics & performance tracking',
            icon: 'stats-chart-outline' as const,
            iconBg: '#fef3c7',
            iconColor: '#b45309',
            onPress: () => navigation.navigate('KpiDashboard'),
          },
        ]
      : []),
    ...(showMarketingModule
      ? [
          {
            key: 'customer-marketing',
            title: 'Customer & Marketing',
            description: 'Customer engagement, campaigns & outreach',
            icon: 'megaphone-outline' as const,
            iconBg: '#fce7f3',
            iconColor: '#db2777',
            comingSoon: true,
            onPress: () => showComingSoonAlert('Customer & Marketing'),
          },
        ]
      : []),
    ...(showQuotationsModule
      ? [
          {
            key: 'quotations',
            title: 'Quotations',
            description: 'Create and send price quotes to customers',
            icon: 'clipboard-outline' as const,
            iconBg: '#e0f2fe',
            iconColor: '#0369a1',
            onPress: () => navigation.navigate('QuotationsList'),
          },
        ]
      : []),
    {
      key: 'user-behavior',
      title: 'User behavior',
      description: 'Peak hours, top products & customer purchasing insights',
      icon: 'pulse-outline',
      iconBg: '#ede9fe',
      iconColor: '#6d28d9',
      onPress: () => navigation.navigate('UserBehavior'),
    },
    {
      key: 'reports',
      title: 'Reports',
      description: 'Sales summaries, exports & business reports',
      icon: 'document-text-outline',
      iconBg: '#dbeafe',
      iconColor: '#1d4ed8',
      comingSoon: true,
      onPress: () => showComingSoonAlert('Reports'),
    },
  ];

  const preferenceItems: MenuItem[] = [
    {
      key: 'theme',
      title: 'Change theme',
      description: 'Light, dark, or match system',
      icon: 'color-palette-outline',
      iconBg: paperTheme.colors.primaryContainer,
      iconColor: primary,
      onPress: () => navigation.navigate('ThemePreference'),
    },
  ];

  const sessionItems: MenuItem[] = [
    {
      key: 'logout',
      title: 'Log out',
      description: 'End this session',
      icon: 'log-out-outline',
      iconBg: '#fee2e2',
      iconColor: '#b91c1c',
      onPress: confirmLogout,
      danger: true,
    },
  ];

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
          title="Settings"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
                borderWidth: 1,
              },
              cardShadow(resolvedTheme),
            ]}
          >
            <View
              style={[styles.heroAccent, { backgroundColor: primary }]}
            />
            <View style={styles.heroRow}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: paperTheme.colors.primaryContainer,
                    borderColor: `${primary}44`,
                  },
                ]}
              >
                <Text style={[styles.avatarText, { color: primary }]}>
                  {displayName
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileText}>
                <Text style={[styles.displayName, { color: paperTheme.colors.onSurface }]}>
                  {displayName}
                </Text>
                <Text style={[styles.roleHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {shopLabel}
                </Text>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: paperTheme.colors.primaryContainer },
                    ]}
                  >
                    <Text style={[styles.roleBadgeText, { color: primary }]}>
                      {displayRole.charAt(0).toUpperCase() + displayRole.slice(1)}
                    </Text>
                  </View>
                {subscriptionBadge ? (
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: subscriptionBadge.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: subscriptionBadge.color },
                        ]}
                      >
                        {subscriptionBadge.label}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {shop?.status === 'trial' ? (
                  <View
                    style={[
                      styles.trialEndBanner,
                      {
                        backgroundColor:
                          resolvedTheme === 'dark' ? '#422006' : '#fffbeb',
                        borderColor: '#f59e0b',
                      },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={resolvedTheme === 'dark' ? '#fbbf24' : '#b45309'}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={[
                          styles.trialEndLabel,
                          {
                            color:
                              resolvedTheme === 'dark' ? '#fcd34d' : '#92400e',
                          },
                        ]}
                      >
                        Trial period
                      </Text>
                      <Text
                        style={[
                          styles.trialEndDate,
                          {
                            color:
                              resolvedTheme === 'dark' ? '#fef3c7' : '#78350f',
                          },
                        ]}
                      >
                        {formatShopDate(shop.trailStartDate)} –{' '}
                        {formatTrialEndDate(shop.trailEndDate)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {shop?.status === 'active' ? (
                  <View
                    style={[
                      styles.trialEndBanner,
                      {
                        backgroundColor:
                          resolvedTheme === 'dark' ? '#052e16' : '#f0fdf4',
                        borderColor: '#86efac',
                      },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={resolvedTheme === 'dark' ? '#4ade80' : '#15803d'}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={[
                          styles.trialEndLabel,
                          {
                            color:
                              resolvedTheme === 'dark' ? '#bbf7d0' : '#166534',
                          },
                        ]}
                      >
                        Next payment
                      </Text>
                      <Text
                        style={[
                          styles.trialEndDate,
                          {
                            color:
                              resolvedTheme === 'dark' ? '#dcfce7' : '#14532d',
                          },
                        ]}
                      >
                        {formatShopDate(shop.nextPaymentDate)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {shop?.status === 'due' ? (
                  <View
                    style={[
                      styles.trialEndBanner,
                      {
                        backgroundColor:
                          resolvedTheme === 'dark' ? '#450a0a' : '#fef2f2',
                        borderColor: '#fca5a5',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={18}
                        color={resolvedTheme === 'dark' ? '#fca5a5' : '#b91c1c'}
                      />
                      <Text
                        style={[
                          styles.trialEndLabel,
                          {
                            color:
                              resolvedTheme === 'dark' ? '#fecaca' : '#991b1b',
                          },
                        ]}
                      >
                        Payment due · {Number(shop.subscriptionDueDays ?? 0)} day
                        {Number(shop.subscriptionDueDays ?? 0) === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.trialEndDate,
                        {
                          color:
                            resolvedTheme === 'dark' ? '#fecaca' : '#7f1d1d',
                          marginTop: 4,
                        },
                      ]}
                    >
                      After 14 days you will not be able to log in. Pay before
                      then to continue using Smart Cost.
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <SettingsMenuGroup
            label="Account"
            items={accountItems}
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          />
          <SettingsMenuGroup
            label="Payment and Feature"
            items={paymentAndFeatureItems}
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          />
          <SettingsMenuGroup
            label="Modules"
            items={moduleItems}
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          />
          <SettingsMenuGroup
            label="Preferences"
            items={preferenceItems}
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          />
          <SettingsMenuGroup
            label="Session"
            items={sessionItems}
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          />
        </ScrollView>
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

const moduleStyles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  soonBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  soonBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
