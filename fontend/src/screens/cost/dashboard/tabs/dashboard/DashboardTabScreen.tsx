import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../context/ThemeContext';
import {
  costCardShadow,
  costDashboardStyles as styles,
} from '../../shared/costDashboardStyles';
import {
  CURRENT_MONTH_CATEGORIES,
  CURRENT_MONTH_CATEGORY_COUNT,
  CURRENT_MONTH_EXPENSE_COUNT,
  CURRENT_MONTH_TOTAL,
  formatCostAmount,
} from '../../shared/costDashboardMockData';
import CostDashboardQuickActions from '../../components/CostDashboardQuickActions';
import { CostDashboardWelcomeBanner } from '../../components/CostDashboardTopBar';

export default function DashboardTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <CostDashboardWelcomeBanner />
      <CostDashboardQuickActions />

      <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Current month overview
      </Text>

      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: paperTheme.colors.primaryContainer,
              borderColor: `${paperTheme.colors.primary}33`,
            },
            costCardShadow(resolvedTheme),
          ]}
        >
          <Ionicons name="folder-outline" size={22} color={paperTheme.colors.primary} />
          <Text style={[styles.statLabel, { color: paperTheme.colors.onPrimaryContainer }]}>
            Categories
          </Text>
          <Text style={[styles.statValue, { color: paperTheme.colors.onPrimaryContainer }]}>
            {CURRENT_MONTH_CATEGORY_COUNT}
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: paperTheme.colors.secondaryContainer,
              borderColor: `${paperTheme.colors.secondary}33`,
            },
            costCardShadow(resolvedTheme),
          ]}
        >
          <Ionicons name="receipt-outline" size={22} color={paperTheme.colors.secondary} />
          <Text style={[styles.statLabel, { color: paperTheme.colors.onSecondaryContainer }]}>
            Expense records
          </Text>
          <Text style={[styles.statValue, { color: paperTheme.colors.onSecondaryContainer }]}>
            {CURRENT_MONTH_EXPENSE_COUNT}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.totalCard,
          {
            backgroundColor: paperTheme.colors.surface,
            borderColor: paperTheme.colors.outlineVariant,
          },
          costCardShadow(resolvedTheme),
        ]}
      >
        <Text style={[styles.totalLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Total cost this month
        </Text>
        <Text style={[styles.totalAmount, { color: paperTheme.colors.onSurface, fontSize: 28 }]}>
          {formatCostAmount(CURRENT_MONTH_TOTAL)}
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        By category · current month
      </Text>
      {CURRENT_MONTH_CATEGORIES.map((item) => (
        <View
          key={item.id}
          style={[
            styles.listCard,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: paperTheme.colors.outlineVariant,
            },
            costCardShadow(resolvedTheme),
          ]}
        >
          <View style={[styles.listIcon, { backgroundColor: `${item.color}22` }]}>
            <Ionicons name="pricetag-outline" size={20} color={item.color} />
          </View>
          <View style={styles.listBody}>
            <Text style={[styles.listTitle, { color: paperTheme.colors.onSurface }]}>
              {item.name}
            </Text>
            <Text style={[styles.listSub, { color: paperTheme.colors.onSurfaceVariant }]}>
              {item.expenseCount} expense{item.expenseCount === 1 ? '' : 's'} this month
            </Text>
          </View>
          <Text style={[styles.listAmount, { color: paperTheme.colors.onSurface }]}>
            {formatCostAmount(item.amount)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
