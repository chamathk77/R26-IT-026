import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { kpiStyles } from '../shared/kpiStyles';

type Props = {
  title: string;
  onPressBack?: () => void;
  onPressSettings?: () => void;
};

export default function KpiTopBar({ title, onPressBack, onPressSettings }: Props) {
  const { paperTheme } = useTheme();

  return (
    <View style={kpiStyles.topBar}>
      <View style={kpiStyles.topBarSide}>
        {onPressBack ? (
          <TouchableOpacity onPress={onPressBack} hitSlop={8} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={paperTheme.colors.onBackground} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={kpiStyles.topBarCenter}>
        <Text style={[kpiStyles.topBarTitle, { color: paperTheme.colors.onBackground }]}>
          {title}
        </Text>
      </View>
      <View style={kpiStyles.topBarSide}>
        {onPressSettings ? (
          <TouchableOpacity onPress={onPressSettings} hitSlop={8} accessibilityLabel="Open settings">
            <Ionicons name="settings-outline" size={24} color={paperTheme.colors.onBackground} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
