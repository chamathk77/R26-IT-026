import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CostAnalysisTabParamList } from '../../../navigation/CostAnalysisTabParamList';
import { useTheme } from '../../../context/ThemeContext';
import { sharedCostAnalysisStyles as styles } from './sharedCostAnalysisStyles';

type DemandProps = BottomTabScreenProps<CostAnalysisTabParamList, 'Demand'>;

export function DemandTabScreen(_props: DemandProps) {
  const { paperTheme } = useTheme();
  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: paperTheme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: paperTheme.colors.onBackground }]}>Demand</Text>
      <Text style={[styles.body, { color: paperTheme.colors.onSurfaceVariant }]}>
        Volume, seasonality, and forecast signals will appear here.
      </Text>
      <View style={[styles.card, { backgroundColor: paperTheme.colors.surface }]}>
        <Ionicons name="pie-chart-outline" size={48} color={paperTheme.colors.tertiary} />
        <Text style={[styles.cardHint, { color: paperTheme.colors.onSurfaceVariant }]}>
          Dummy demand analysis — connect data when ready.
        </Text>
      </View>
    </ScrollView>
  );
}
