import React from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../../context/ThemeContext';
import { useDummySession } from '../../../context/DummySessionContext';
import { AppDispatch, RootState } from '../../../store/store';
import { clearLoginSession } from '../../../store/reducers/AuthReducer';
import { clearSavedToken } from '../../../utils/secureStorage';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import type { LoginShop } from '../../../type/auth';
import { cardShadow, settingsMenuStyles as styles } from '../shared/settingsDetailStyles';

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
  const user = useSelector((state: RootState) => state.AuthReducer.Login.userData);
  const shop = useSelector((state: RootState) => state.AuthReducer.Login.shopData);

  const primary = paperTheme.colors.primary;
  const displayName = user?.name ?? 'User';
  const displayRole = user?.role ?? 'staff';
  const shopLabel = shop?.shopName?.trim() || shop?.shopId || 'No shop linked';
  const subscriptionBadge = getSubscriptionBadge(shop);
  const showManage = displayRole === 'owner' || displayRole === 'admin';

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

  const goToModuleHub = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'ModuleHub' }],
    });
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
    ...(showManage
      ? [
          {
            key: 'manage',
            title: 'Manage account',
            description:
              displayRole === 'owner' ? 'Admins & staff' : 'Staff accounts',
            icon: 'people-outline' as const,
            iconBg: paperTheme.colors.tertiaryContainer,
            iconColor: paperTheme.colors.tertiary,
            onPress: () => navigation.navigate('ManageAccount'),
          },
        ]
      : []),
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
    {
      key: 'module',
      title: 'Change module',
      description: 'Back to hub — POS or Cost Management',
      icon: 'grid-outline',
      iconBg: paperTheme.colors.surfaceVariant,
      iconColor: primary,
      onPress: goToModuleHub,
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
    </>
  );
}
