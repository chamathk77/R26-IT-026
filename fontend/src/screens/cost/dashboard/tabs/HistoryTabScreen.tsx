import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import {
  costCardShadow,
  costDashboardStyles as styles,
} from '../shared/costDashboardStyles';
import { COST_HISTORY_ROWS, formatCostAmount } from '../shared/costDashboardMockData';

export default function HistoryTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Expense history
      </Text>
      {COST_HISTORY_ROWS.map((row) => (
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
              { backgroundColor: paperTheme.colors.tertiaryContainer },
            ]}
          >
            <Ionicons name="receipt-outline" size={20} color={paperTheme.colors.tertiary} />
          </View>
          <View style={styles.listBody}>
            <Text style={[styles.listTitle, { color: paperTheme.colors.onSurface }]}>
              {row.title}
            </Text>
            <Text style={[styles.listSub, { color: paperTheme.colors.onSurfaceVariant }]}>
              {row.category} · {row.date}
            </Text>
          </View>
          <Text style={[styles.listAmount, { color: paperTheme.colors.error }]}>
            -{formatCostAmount(row.amount)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
