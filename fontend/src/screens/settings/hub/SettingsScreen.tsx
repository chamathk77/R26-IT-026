import React from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Portal } from 'react-native-paper';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../../context/ThemeContext';
import { useDummySession } from '../../../context/DummySessionContext';
import { AppDispatch, RootState } from '../../../store/store';
import { clearLoginSession } from '../../../store/reducers/AuthReducer';
import { clearSavedToken } from '../../../utils/secureStorage';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import type { LoginShop } from '../../../type/auth';
import { cardShadow, settingsMenuStyles as styles } from '../shared/settingsDetailStyles';
import { fonts } from '../../../constants/fonts';

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

function getSubscriptionBadge(shop: LoginShop | null | undefined) {
  const status = shop?.status;

  if (status === 'active') {
    return {
      label: 'Subscribed',
      bg: '#dcfce7',
      color: '#15803d',
      showEndDate: false,
    };
  }

  if (status === 'trial') {
    return {
      label: 'Trial',
      bg: '#fef3c7',
      color: '#b45309',
      showEndDate: true,
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

  const primary = paperTheme.colors.primary;
  const displayName = user?.name ?? 'User';
  const displayRole = user?.role ?? 'staff';
  const shopLabel = shop?.shopName?.trim() || shop?.shopId || 'No shop linked';
  const subscriptionBadge = getSubscriptionBadge(shop);
  const showManageUsers = displayRole === 'owner';

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
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await clearSavedToken();
          dispatch(clearLoginSession());
          logoutSession();
        },
      },
    ]);
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
    {
      key: 'payments',
      title: 'Subscription payments',
      description: 'Payment history & current status',
      icon: 'card-outline',
      iconBg: '#dbeafe',
      iconColor: '#1d4ed8',
      onPress: () => navigation.navigate('SubscriptionPayments'),
    },
    ...(showManageUsers
      ? [
          {
            key: 'manage',
            title: 'Manage account',
            description: 'Admins & staff for your shop',
            icon: 'people-outline' as const,
            iconBg: paperTheme.colors.tertiaryContainer,
            iconColor: paperTheme.colors.tertiary,
            onPress: () => navigation.navigate('ManageAccount'),
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
    {
      key: 'cost',
      title: 'Cost Management',
      description: 'Track spending, margins & financial insights',
      icon: 'calculator-outline',
      iconBg: '#ede9fe',
      iconColor: '#6d28d9',
      onPress: goToCostManagement,
    },
    {
      key: 'analytics',
      title: 'Analytics',
      description: 'Business trends, insights & data visualization',
      icon: 'analytics-outline',
      iconBg: '#ccfbf1',
      iconColor: '#0f766e',
      comingSoon: true,
      onPress: () => showComingSoonAlert('Analytics'),
    },
    {
      key: 'kpi',
      title: 'Key Performance Indicators',
      description: 'KPI dashboard, metrics & performance tracking',
      icon: 'stats-chart-outline',
      iconBg: '#fef3c7',
      iconColor: '#b45309',
      onPress: () => navigation.navigate('KpiDashboard'),
    },
    {
      key: 'customer-marketing',
      title: 'Customer & Marketing',
      description: 'Customer engagement, campaigns & outreach',
      icon: 'megaphone-outline',
      iconBg: '#fce7f3',
      iconColor: '#db2777',
      comingSoon: true,
      onPress: () => showComingSoonAlert('Customer & Marketing'),
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
                {subscriptionBadge?.showEndDate ? (
                  <View
                    style={[
                      styles.trialEndBanner,
                      {
                        backgroundColor:
                          resolvedTheme === 'dark' ? '#422006' : '#fffbeb',
                        borderColor:
                          resolvedTheme === 'dark' ? '#f59e0b' : '#f59e0b',
                      },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={resolvedTheme === 'dark' ? '#fbbf24' : '#b45309'}
                    />
                    <Text
                      style={[
                        styles.trialEndLabel,
                        {
                          color:
                            resolvedTheme === 'dark' ? '#fcd34d' : '#92400e',
                        },
                      ]}
                    >
                      Trial ends
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
                      {formatTrialEndDate(shop?.trailEndDate)}
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
