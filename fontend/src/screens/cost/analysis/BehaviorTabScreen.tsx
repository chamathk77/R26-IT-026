import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CostAnalysisTabParamList } from '../../../navigation/CostAnalysisTabParamList'; 
import { useTheme } from '../../../context/ThemeContext';
import { sharedCostAnalysisStyles as styles } from './sharedCostAnalysisStyles';

type BehaviorProps = BottomTabScreenProps<CostAnalysisTabParamList, 'Behavior'>;

export function BehaviorTabScreen(_props: BehaviorProps) {
  const { paperTheme } = useTheme();
  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: paperTheme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: paperTheme.colors.onBackground }]}>Behavior</Text>
      <Text style={[styles.body, { color: paperTheme.colors.onSurfaceVariant }]}>
        Spending patterns and category habits will appear here.
      </Text>
      <View style={[styles.card, { backgroundColor: paperTheme.colors.surface }]}>
        <Ionicons name="people-outline" size={48} color={paperTheme.colors.secondary} />
        <Text style={[styles.cardHint, { color: paperTheme.colors.onSurfaceVariant }]}>
          Dummy behavior insights — connect data when ready.
        </Text>
      </View>
    </ScrollView>
  );
}
