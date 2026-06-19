import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import {
  costCardShadow,
  costDashboardStyles as styles,
} from '../shared/costDashboardStyles';
import { COST_SUMMARY_ROWS, formatCostAmount } from '../shared/costDashboardMockData';

export default function SummaryTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();
  const total = COST_SUMMARY_ROWS.reduce((sum, row) => sum + row.amount, 0);

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.totalCard,
          {
            backgroundColor: paperTheme.colors.secondaryContainer,
            borderColor: `${paperTheme.colors.secondary}33`,
          },
          costCardShadow(resolvedTheme),
        ]}
      >
        <Text style={[styles.totalLabel, { color: paperTheme.colors.onSecondaryContainer }]}>
          Summary total
        </Text>
        <Text style={[styles.totalAmount, { color: paperTheme.colors.onSecondaryContainer }]}>
          {formatCostAmount(total)}
        </Text>
        <Text
          style={[
            styles.totalHint,
            { color: paperTheme.colors.onSecondaryContainer, opacity: 0.85 },
          ]}
        >
          {COST_SUMMARY_ROWS.length} expense groups
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Expense summary
      </Text>
      {COST_SUMMARY_ROWS.map((row) => (
        <View
          key={row.id}
          style={[
            styles.listCard,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: paperTheme.colors.outlineVariant,
            },
            costCardShadow(resolvedTheme),
          ]}
        >
          <View
            style={[
              styles.listIcon,
              { backgroundColor: paperTheme.colors.primaryContainer },
            ]}
          >
            <Ionicons name="pie-chart-outline" size={20} color={paperTheme.colors.primary} />
          </View>
          <View style={styles.listBody}>
            <Text style={[styles.listTitle, { color: paperTheme.colors.onSurface }]}>
              {row.category}
            </Text>
            <Text style={[styles.listSub, { color: paperTheme.colors.onSurfaceVariant }]}>
              {row.period}
            </Text>
          </View>
          <Text style={[styles.listAmount, { color: paperTheme.colors.onSurface }]}>
            {formatCostAmount(row.amount)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
