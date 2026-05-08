import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CostAnalysisTabParamList } from '../../navigation/CostAnalysisTabParamList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';

type PerfProps = BottomTabScreenProps<CostAnalysisTabParamList, 'Performance'>;

export function PerformanceTabScreen(_props: PerfProps) {
  const { paperTheme } = useTheme();
  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: paperTheme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: paperTheme.colors.onBackground }]}>Performance</Text>
      <Text style={[styles.body, { color: paperTheme.colors.onSurfaceVariant }]}>
        KPIs, margins, and efficiency metrics will appear here.
      </Text>
      <View style={[styles.card, { backgroundColor: paperTheme.colors.surface }]}>
        <Ionicons name="speedometer-outline" size={48} color={paperTheme.colors.primary} />
        <Text style={[styles.cardHint, { color: paperTheme.colors.onSurfaceVariant }]}>
          Dummy performance overview — connect data when ready.
        </Text>
      </View>
    </ScrollView>
  );
}

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

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  heading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
    marginBottom: 8,
    marginTop: 8,
  },
  body: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  cardHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 300,
  },
});
