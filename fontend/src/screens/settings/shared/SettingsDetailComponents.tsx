import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import { settingsDetailStyles as styles, cardShadow } from './settingsDetailStyles';

type ThemeMode = 'light' | 'dark';

export function SettingsEmptyState({
  icon,
  title,
  description,
  paperTheme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  paperTheme: MD3Theme;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View
        style={[
          styles.emptyIconRing,
          { backgroundColor: paperTheme.colors.primaryContainer },
        ]}
      >
        <Ionicons name={icon} size={40} color={paperTheme.colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
        {title}
      </Text>
      <Text
        style={[styles.emptyDesc, { color: paperTheme.colors.onSurfaceVariant }]}
      >
        {description}
      </Text>
    </View>
  );
}

export function SettingsBadge({
  label,
  tone = 'primary',
  paperTheme,
}: {
  label: string;
  tone?: 'primary' | 'success' | 'warning' | 'neutral';
  paperTheme: MD3Theme;
}) {
  const palette = {
    primary: {
      bg: paperTheme.colors.primaryContainer,
      text: paperTheme.colors.primary,
    },
    success: { bg: '#dcfce7', text: '#15803d' },
    warning: { bg: '#fef3c7', text: '#b45309' },
    neutral: {
      bg: paperTheme.colors.surfaceVariant,
      text: paperTheme.colors.onSurfaceVariant,
    },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function SettingsHeroCard({
  paperTheme,
  resolvedTheme,
  avatarText,
  icon,
  title,
  subtitle,
  badges,
}: {
  paperTheme: MD3Theme;
  resolvedTheme: ThemeMode;
  avatarText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
}) {
  return (
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
        style={[styles.heroAccent, { backgroundColor: paperTheme.colors.primary }]}
      />
      <View style={styles.heroRow}>
        {avatarText ? (
          <View
            style={[
              styles.heroAvatar,
              {
                backgroundColor: paperTheme.colors.primaryContainer,
                borderColor: `${paperTheme.colors.primary}44`,
              },
            ]}
          >
            <Text style={[styles.heroAvatarText, { color: paperTheme.colors.primary }]}>
              {avatarText}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.heroIconWrap,
              { backgroundColor: paperTheme.colors.primaryContainer },
            ]}
          >
            <Ionicons
              name={icon ?? 'storefront'}
              size={34}
              color={paperTheme.colors.primary}
            />
          </View>
        )}
        <View style={styles.heroBody}>
          <Text style={[styles.heroTitle, { color: paperTheme.colors.onSurface }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.heroSubtitle, { color: paperTheme.colors.onSurfaceVariant }]}
            >
              {subtitle}
            </Text>
          ) : null}
          {badges ? <View style={styles.badgeRow}>{badges}</View> : null}
        </View>
      </View>
    </View>
  );
}

export function SettingsSection({
  title,
  paperTheme,
  resolvedTheme,
  children,
}: {
  title: string;
  paperTheme: MD3Theme;
  resolvedTheme: ThemeMode;
  children: ReactNode;
}) {
  return (
    <>
      <Text
        style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}
      >
        {title}
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
        {children}
      </View>
    </>
  );
}

export function SettingsDetailRow({
  icon,
  label,
  value,
  paperTheme,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  paperTheme: MD3Theme;
  isLast?: boolean;
}) {
  return (
    <>
      <View style={styles.detailRow}>
        <View
          style={[
            styles.detailIconWrap,
            { backgroundColor: paperTheme.colors.primaryContainer },
          ]}
        >
          <Ionicons name={icon} size={18} color={paperTheme.colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text
            style={[styles.detailLabel, { color: paperTheme.colors.onSurfaceVariant }]}
          >
            {label}
          </Text>
          <Text
            style={[styles.detailValue, { color: paperTheme.colors.onSurface }]}
            numberOfLines={3}
          >
            {value}
          </Text>
        </View>
      </View>
      {!isLast ? (
        <View
          style={[
            styles.rowDivider,
            { backgroundColor: paperTheme.colors.outlineVariant },
          ]}
        />
      ) : null}
    </>
  );
}

export function SettingsModuleGrid({
  modules,
  paperTheme,
}: {
  modules: Array<{
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    enabled?: boolean;
  }>;
  paperTheme: MD3Theme;
}) {
  return (
    <View style={styles.moduleGrid}>
      {modules.map((mod) => {
        const active = Boolean(mod.enabled);
        return (
          <View
            key={mod.key}
            style={[
              styles.moduleTile,
              {
                backgroundColor: active
                  ? `${paperTheme.colors.primary}12`
                  : paperTheme.colors.surfaceVariant,
                borderColor: active
                  ? `${paperTheme.colors.primary}33`
                  : paperTheme.colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.moduleTileTop}>
              <Ionicons
                name={mod.icon}
                size={20}
                color={active ? paperTheme.colors.primary : paperTheme.colors.outline}
              />
              <View
                style={[
                  styles.moduleDot,
                  {
                    backgroundColor: active ? '#22c55e' : paperTheme.colors.outline,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.moduleTileLabel,
                {
                  color: active
                    ? paperTheme.colors.onSurface
                    : paperTheme.colors.onSurfaceVariant,
                },
              ]}
            >
              {mod.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
