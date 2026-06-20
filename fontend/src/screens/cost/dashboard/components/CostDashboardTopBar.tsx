import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { costCardShadow, costDashboardStyles as styles } from '../shared/costDashboardStyles';

type Props = {
  onPressSettings: () => void;
  onPressBack?: () => void;
  title?: string;
};

export default function CostDashboardTopBar({
  onPressSettings,
  onPressBack,
  title = 'Cost Management',
}: Props) {
  const { paperTheme } = useTheme();

  return (
    <View style={styles.topBar}>
      <View style={styles.topBarSide}>
        {onPressBack ? (
          <TouchableOpacity onPress={onPressBack} hitSlop={8} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={paperTheme.colors.onBackground} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.topBarCenter}>
        <Text style={[styles.topBarTitle, { color: paperTheme.colors.onBackground }]}>
          {title}
        </Text>
      </View>
      <View style={styles.topBarSide}>
        <TouchableOpacity
          onPress={onPressSettings}
          hitSlop={8}
          accessibilityLabel="Open settings"
        >
          <Ionicons name="settings-outline" size={24} color={paperTheme.colors.onBackground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function CostDashboardWelcomeBanner() {
  const { paperTheme, resolvedTheme } = useTheme();

  return (
    <View
      style={[
        styles.welcomeCard,
        {
          backgroundColor: paperTheme.colors.primaryContainer,
          borderColor: `${paperTheme.colors.primary}33`,
        },
        costCardShadow(resolvedTheme),
      ]}
    >
      <View style={[styles.welcomeAccent, { backgroundColor: paperTheme.colors.primary }]} />
      <Text style={[styles.welcomeEyebrow, { color: paperTheme.colors.onPrimaryContainer }]}>
        Welcome to
      </Text>
      <Text style={[styles.welcomeTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
        Cost Management
      </Text>
      <Text style={[styles.welcomeBrand, { color: paperTheme.colors.primary }]}>
        Smart Cost
      </Text>
    </View>
  );
}
