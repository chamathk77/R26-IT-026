import React, { useState } from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import {
  SettingsBadge,
  SettingsHeroCard,
  SettingsSection,
} from '../shared/SettingsDetailComponents';
import { userBehaviorStyles as styles } from './userBehaviorStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'UserBehavior'>;

type RangeKey = 'today' | 'week' | 'month';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 days' },
  { key: 'month', label: '30 days' },
];

type Stat = {
  key: string;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  tintBg: string;
};

const STATS: Record<RangeKey, Stat[]> = {
  today: [
    {
      key: 'active-users',
      label: 'Active users',
      value: '6',
      trend: '+2 vs yesterday',
      trendUp: true,
      icon: 'people-outline',
      tint: '#0284c7',
      tintBg: '#e0f2fe',
    },
    {
      key: 'sessions',
      label: 'Sessions',
      value: '24',
      trend: '+15%',
      trendUp: true,
      icon: 'log-in-outline',
      tint: '#7c3aed',
      tintBg: '#ede9fe',
    },
    {
      key: 'avg-session',
      label: 'Avg. session',
      value: '18m',
      trend: '-3m',
      trendUp: false,
      icon: 'time-outline',
      tint: '#b45309',
      tintBg: '#fef3c7',
    },
    {
      key: 'actions',
      label: 'Actions',
      value: '412',
      trend: '+9%',
      trendUp: true,
      icon: 'flash-outline',
      tint: '#15803d',
      tintBg: '#dcfce7',
    },
  ],
  week: [
    {
      key: 'active-users',
      label: 'Active users',
      value: '11',
      trend: '+3 vs last week',
      trendUp: true,
      icon: 'people-outline',
      tint: '#0284c7',
      tintBg: '#e0f2fe',
    },
    {
      key: 'sessions',
      label: 'Sessions',
      value: '168',
      trend: '+12%',
      trendUp: true,
      icon: 'log-in-outline',
      tint: '#7c3aed',
      tintBg: '#ede9fe',
    },
    {
      key: 'avg-session',
      label: 'Avg. session',
      value: '21m',
      trend: '+4m',
      trendUp: true,
      icon: 'time-outline',
      tint: '#b45309',
      tintBg: '#fef3c7',
    },
    {
      key: 'actions',
      label: 'Actions',
      value: '2,948',
      trend: '+6%',
      trendUp: true,
      icon: 'flash-outline',
      tint: '#15803d',
      tintBg: '#dcfce7',
    },
  ],
  month: [
    {
      key: 'active-users',
      label: 'Active users',
      value: '14',
      trend: '+1 vs last month',
      trendUp: true,
      icon: 'people-outline',
      tint: '#0284c7',
      tintBg: '#e0f2fe',
    },
    {
      key: 'sessions',
      label: 'Sessions',
      value: '702',
      trend: '+8%',
      trendUp: true,
      icon: 'log-in-outline',
      tint: '#7c3aed',
      tintBg: '#ede9fe',
    },
    {
      key: 'avg-session',
      label: 'Avg. session',
      value: '19m',
      trend: '-1m',
      trendUp: false,
      icon: 'time-outline',
      tint: '#b45309',
      tintBg: '#fef3c7',
    },
    {
      key: 'actions',
      label: 'Actions',
      value: '12,436',
      trend: '+11%',
      trendUp: true,
      icon: 'flash-outline',
      tint: '#15803d',
      tintBg: '#dcfce7',
    },
  ],
};

const FEATURE_USAGE: {
  key: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  share: number;
  meta: string;
}[] = [
  { key: 'pos', name: 'POS & checkout', icon: 'cart-outline', share: 46, meta: '1,352 actions · 8 users' },
  { key: 'inventory', name: 'Inventory', icon: 'cube-outline', share: 23, meta: '678 actions · 5 users' },
  { key: 'history', name: 'Order history', icon: 'receipt-outline', share: 14, meta: '412 actions · 6 users' },
  { key: 'quotations', name: 'Quotations', icon: 'clipboard-outline', share: 10, meta: '295 actions · 3 users' },
  { key: 'settings', name: 'Settings', icon: 'settings-outline', share: 7, meta: '211 actions · 2 users' },
];

const PEAK_HOURS: { label: string; value: number }[] = [
  { label: '8a', value: 22 },
  { label: '10a', value: 48 },
  { label: '12p', value: 86 },
  { label: '2p', value: 64 },
  { label: '4p', value: 55 },
  { label: '6p', value: 92 },
  { label: '8p', value: 70 },
  { label: '10p', value: 30 },
];

const TEAM_ACTIVITY: {
  key: string;
  name: string;
  role: string;
  lastActive: string;
  actions: number;
  online: boolean;
}[] = [
  { key: 'u1', name: 'Nimal Perera', role: 'Owner', lastActive: 'Active now', actions: 486, online: true },
  { key: 'u2', name: 'Sanduni Silva', role: 'Admin', lastActive: '12 min ago', actions: 372, online: true },
  { key: 'u3', name: 'Kasun Fernando', role: 'Cashier', lastActive: '1 hr ago', actions: 291, online: false },
  { key: 'u4', name: 'Tharindu Jay', role: 'Cashier', lastActive: 'Yesterday', actions: 145, online: false },
  { key: 'u5', name: 'Ishara Madushani', role: 'Staff', lastActive: '3 days ago', actions: 38, online: false },
];

const RECENT_ACTIVITY: {
  key: string;
  title: string;
  description: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  tintBg: string;
}[] = [
  {
    key: 'a1',
    title: 'Sale completed',
    description: 'Kasun Fernando checked out order #10482 · Rs. 4,250',
    time: '2 min ago',
    icon: 'cart-outline',
    tint: '#15803d',
    tintBg: '#dcfce7',
  },
  {
    key: 'a2',
    title: 'Discount applied',
    description: 'Sanduni Silva applied 10% discount on order #10479',
    time: '18 min ago',
    icon: 'pricetag-outline',
    tint: '#b45309',
    tintBg: '#fef3c7',
  },
  {
    key: 'a3',
    title: 'Stock updated',
    description: 'Nimal Perera edited 12 products in Inventory',
    time: '46 min ago',
    icon: 'cube-outline',
    tint: '#0284c7',
    tintBg: '#e0f2fe',
  },
  {
    key: 'a4',
    title: 'Order voided',
    description: 'Tharindu Jay voided order #10471 · Rs. 1,120',
    time: '2 hr ago',
    icon: 'close-circle-outline',
    tint: '#b91c1c',
    tintBg: '#fee2e2',
  },
  {
    key: 'a5',
    title: 'New login',
    description: 'Ishara Madushani signed in from a new device',
    time: '5 hr ago',
    icon: 'log-in-outline',
    tint: '#7c3aed',
    tintBg: '#ede9fe',
  },
];

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function UserBehaviorScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const [range, setRange] = useState<RangeKey>('week');

  const stats = STATS[range];
  const rangeLabel = RANGES.find((item) => item.key === range)?.label ?? '';
  const peakMax = Math.max(...PEAK_HOURS.map((hour) => hour.value));

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
          title="User behavior"
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
            icon="pulse-outline"
            title="Team activity insights"
            subtitle="See how your team uses Smart POS — sessions, top features and recent actions."
            badges={
              <>
                <SettingsBadge label={rangeLabel} tone="primary" paperTheme={paperTheme} />
                <SettingsBadge label="Preview data" tone="warning" paperTheme={paperTheme} />
              </>
            }
          />

          <View style={styles.rangeRow}>
            {RANGES.map((item) => {
              const active = item.key === range;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.rangeChip,
                    {
                      backgroundColor: active
                        ? paperTheme.colors.primaryContainer
                        : paperTheme.colors.surface,
                      borderColor: active
                        ? paperTheme.colors.primary
                        : paperTheme.colors.outlineVariant,
                    },
                  ]}
                  onPress={() => setRange(item.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.rangeChipText,
                      {
                        color: active
                          ? paperTheme.colors.primary
                          : paperTheme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.statGrid}>
            {stats.map((stat) => (
              <View
                key={stat.key}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
              >
                <View style={[styles.statIconWrap, { backgroundColor: stat.tintBg }]}>
                  <Ionicons name={stat.icon} size={19} color={stat.tint} />
                </View>
                <Text style={[styles.statValue, { color: paperTheme.colors.onSurface }]}>
                  {stat.value}
                </Text>
                <Text
                  style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}
                >
                  {stat.label}
                </Text>
                <Text
                  style={[
                    styles.statTrend,
                    { color: stat.trendUp ? '#15803d' : '#b91c1c' },
                  ]}
                >
                  {stat.trendUp ? '▲' : '▼'} {stat.trend}
                </Text>
              </View>
            ))}
          </View>

          <SettingsSection
            title="Most used features"
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          >
            {FEATURE_USAGE.map((feature, index) => (
              <React.Fragment key={feature.key}>
                <View style={styles.featureRow}>
                  <View style={styles.featureTop}>
                    <Ionicons
                      name={feature.icon}
                      size={18}
                      color={paperTheme.colors.primary}
                    />
                    <Text
                      style={[styles.featureName, { color: paperTheme.colors.onSurface }]}
                    >
                      {feature.name}
                    </Text>
                    <Text
                      style={[styles.featureShare, { color: paperTheme.colors.primary }]}
                    >
                      {feature.share}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.featureTrack,
                      { backgroundColor: paperTheme.colors.surfaceVariant },
                    ]}
                  >
                    <View
                      style={[
                        styles.featureFill,
                        {
                          width: `${feature.share}%`,
                          backgroundColor: paperTheme.colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.featureMeta,
                      { color: paperTheme.colors.onSurfaceVariant },
                    ]}
                  >
                    {feature.meta}
                  </Text>
                </View>
                {index < FEATURE_USAGE.length - 1 ? (
                  <View
                    style={[
                      styles.rowDivider,
                      { backgroundColor: paperTheme.colors.outlineVariant },
                    ]}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </SettingsSection>

          <SettingsSection
            title="Busiest hours"
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          >
            <View style={styles.peakRow}>
              {PEAK_HOURS.map((hour) => {
                const ratio = hour.value / peakMax;
                const isPeak = hour.value === peakMax;
                return (
                  <View key={hour.label} style={styles.peakBarWrap}>
                    <View
                      style={[
                        styles.peakBar,
                        {
                          height: `${Math.max(ratio * 100, 6)}%`,
                          backgroundColor: isPeak
                            ? paperTheme.colors.primary
                            : `${paperTheme.colors.primary}40`,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.peakLabel,
                        { color: paperTheme.colors.onSurfaceVariant },
                      ]}
                    >
                      {hour.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </SettingsSection>

          <SettingsSection
            title="Team activity"
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          >
            {TEAM_ACTIVITY.map((member, index) => (
              <React.Fragment key={member.key}>
                <View style={styles.memberRow}>
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: paperTheme.colors.primaryContainer },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberAvatarText,
                        { color: paperTheme.colors.primary },
                      ]}
                    >
                      {initialsOf(member.name)}
                    </Text>
                  </View>
                  <View style={styles.memberBody}>
                    <Text
                      style={[styles.memberName, { color: paperTheme.colors.onSurface }]}
                      numberOfLines={1}
                    >
                      {member.name}
                    </Text>
                    <Text
                      style={[
                        styles.memberMeta,
                        {
                          color: member.online
                            ? '#15803d'
                            : paperTheme.colors.onSurfaceVariant,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {member.role} · {member.lastActive}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.memberActions,
                        { color: paperTheme.colors.onSurface },
                      ]}
                    >
                      {member.actions}
                    </Text>
                    <Text
                      style={[
                        styles.memberActionsLabel,
                        { color: paperTheme.colors.onSurfaceVariant },
                      ]}
                    >
                      actions
                    </Text>
                  </View>
                </View>
                {index < TEAM_ACTIVITY.length - 1 ? (
                  <View
                    style={[
                      styles.rowDivider,
                      { backgroundColor: paperTheme.colors.outlineVariant },
                    ]}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </SettingsSection>

          <SettingsSection
            title="Recent activity"
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          >
            {RECENT_ACTIVITY.map((activity, index) => (
              <React.Fragment key={activity.key}>
                <View style={styles.activityRow}>
                  <View
                    style={[
                      styles.activityIconWrap,
                      { backgroundColor: activity.tintBg },
                    ]}
                  >
                    <Ionicons name={activity.icon} size={17} color={activity.tint} />
                  </View>
                  <View style={styles.activityBody}>
                    <Text
                      style={[
                        styles.activityTitle,
                        { color: paperTheme.colors.onSurface },
                      ]}
                    >
                      {activity.title}
                    </Text>
                    <Text
                      style={[
                        styles.activityDesc,
                        { color: paperTheme.colors.onSurfaceVariant },
                      ]}
                    >
                      {activity.description}
                    </Text>
                    <Text
                      style={[styles.activityTime, { color: paperTheme.colors.outline }]}
                    >
                      {activity.time}
                    </Text>
                  </View>
                </View>
                {index < RECENT_ACTIVITY.length - 1 ? (
                  <View
                    style={[
                      styles.rowDivider,
                      { backgroundColor: paperTheme.colors.outlineVariant },
                    ]}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </SettingsSection>

          <Text style={[styles.footNote, { color: paperTheme.colors.outline }]}>
            Sample figures shown for layout preview. Live tracking will replace them.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
