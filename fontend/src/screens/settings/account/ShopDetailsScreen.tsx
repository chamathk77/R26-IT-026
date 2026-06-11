import React from 'react';
import { ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import { RootState } from '../../../store/store';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { settingsDetailStyles as styles, cardShadow } from '../shared/settingsDetailStyles';
import {
  SettingsBadge,
  SettingsDetailRow,
  SettingsEmptyState,
  SettingsHeroCard,
  SettingsModuleGrid,
  SettingsSection,
} from '../shared/SettingsDetailComponents';

type Props = NativeStackScreenProps<RootStackParamList, 'ShopDetails'>;

function formatValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return String(value);
}

function capitalize(value: string): string {
  if (!value || value === '—') return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusTone(status?: string): 'primary' | 'success' | 'warning' | 'neutral' {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'active' || normalized === 'trial') return 'success';
  if (normalized === 'due' || normalized === 'paymentpending') return 'warning';
  if (normalized === 'disabled' || normalized.includes('diactive')) return 'neutral';
  return 'primary';
}

export default function ShopDetailsScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const shop = useSelector((state: RootState) => state.AuthReducer.Login.shopData);

  if (!shop) {
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
            title="Shop"
            titleColor={paperTheme.colors.onBackground}
            iconColor={paperTheme.colors.onBackground}
            onPressLeftBtn={() => navigation.goBack()}
          />
          <SettingsEmptyState
            icon="storefront-outline"
            title="No shop data"
            description="Shop information loads when you sign in. Please log in again if this screen is empty."
            paperTheme={paperTheme}
          />
        </SafeAreaView>
      </>
    );
  }

  const ownerName = [shop.ownerFirstName, shop.ownerLastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const statusLabel = capitalize(formatValue(shop.status));
  const subscriptionRows = [
    {
      icon: 'pulse-outline' as const,
      label: 'Status',
      value: statusLabel,
    },
    {
      icon: 'footsteps-outline' as const,
      label: 'Onboard step',
      value: capitalize(formatValue(shop.onboardStep)),
    },
    {
      icon: 'people-outline' as const,
      label: 'Max users',
      value: formatValue(shop.maxUsers),
    },
    {
      icon: 'checkmark-circle-outline' as const,
      label: 'Phone verified',
      value: formatValue(shop.isVerifyPhoneNumber),
    },
    {
      icon: 'mail-open-outline' as const,
      label: 'Email verified',
      value: formatValue(shop.isVerifyEmail),
    },
    ...(shop.trailStartDate
      ? [
          {
            icon: 'calendar-outline' as const,
            label: 'Trial start',
            value: formatValue(shop.trailStartDate),
          },
        ]
      : []),
    ...(shop.trailEndDate
      ? [
          {
            icon: 'calendar-outline' as const,
            label: 'Trial end',
            value: formatValue(shop.trailEndDate),
          },
        ]
      : []),
    ...(!shop.trailStartDate && !shop.trailEndDate
      ? [
          {
            icon: 'calendar-outline' as const,
            label: 'Trial period',
            value: 'Not started',
          },
        ]
      : []),
  ];
  const modules = [
    { key: 'sms', label: 'SMS', icon: 'chatbubble-outline' as const, enabled: shop.sms },
    { key: 'kpi', label: 'KPI', icon: 'stats-chart-outline' as const, enabled: shop.kpi },
    { key: 'analytics', label: 'Analytics', icon: 'analytics-outline' as const, enabled: shop.analyticsModule },
    { key: 'cost', label: 'Cost', icon: 'calculator-outline' as const, enabled: shop.costModule },
    { key: 'manual', label: 'Manual order', icon: 'create-outline' as const, enabled: shop.customerManualOrder },
    { key: 'marketing', label: 'Marketing', icon: 'megaphone-outline' as const, enabled: shop.marketingModule },
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
          title="Shop"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <SettingsHeroCard
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
            icon="storefront-outline"
            title={formatValue(shop.shopName)}
            subtitle={formatValue(shop.address)}
            badges={
              <>
                <SettingsBadge
                  label={formatValue(shop.shopId)}
                  tone="primary"
                  paperTheme={paperTheme}
                />
                <SettingsBadge
                  label={statusLabel}
                  tone={statusTone(shop.status)}
                  paperTheme={paperTheme}
                />
              </>
            }
          />

          <SettingsSection
            title="Shop information"
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          >
            <SettingsDetailRow
              icon="barcode-outline"
              label="Shop ID"
              value={formatValue(shop.shopId)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="business-outline"
              label="Shop name"
              value={formatValue(shop.shopName)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="location-outline"
              label="Address"
              value={formatValue(shop.address)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="call-outline"
              label="Shop mobile"
              value={formatValue(shop.shopMobileNumber)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="mail-outline"
              label="Shop email"
              value={formatValue(shop.email)}
              paperTheme={paperTheme}
              isLast
            />
          </SettingsSection>

          <SettingsSection
            title="Owner"
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          >
            <SettingsDetailRow
              icon="person-outline"
              label="Owner name"
              value={ownerName || '—'}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="call-outline"
              label="Owner mobile"
              value={formatValue(shop.ownerMobileNumber)}
              paperTheme={paperTheme}
              isLast
            />
          </SettingsSection>

          <SettingsSection
            title="Subscription"
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          >
            {subscriptionRows.map((row, index) => (
              <SettingsDetailRow
                key={row.label}
                icon={row.icon}
                label={row.label}
                value={row.value}
                paperTheme={paperTheme}
                isLast={index === subscriptionRows.length - 1}
              />
            ))}
          </SettingsSection>

          <Text
            style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}
          >
            Enabled modules
          </Text>
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              cardShadow(resolvedTheme),
            ]}
          >
            <SettingsModuleGrid modules={modules} paperTheme={paperTheme} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
