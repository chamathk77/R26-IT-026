import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import {
  costCardShadow,
  costDashboardStyles as styles,
} from '../shared/costDashboardStyles';
import {
  COST_CATEGORY_BREAKDOWN,
  COST_PERIOD_OPTIONS,
  COST_TOTALS_BY_PERIOD,
  CostPeriodKey,
  formatCostAmount,
  getPeriodLabel,
} from '../shared/costDashboardMockData';

export default function DashboardTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<CostPeriodKey>('current_month');

  const total = COST_TOTALS_BY_PERIOD[selectedPeriod];
  const categories = COST_CATEGORY_BREAKDOWN[selectedPeriod];
  const topCategory = categories[0];

  const showPlaceholderAction = (action: string) => {
    Alert.alert('Coming soon', `${action} will be available in a future update.`);
  };

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Cost period
      </Text>
      <View style={styles.periodRow}>
        {COST_PERIOD_OPTIONS.map((option) => {
          const active = selectedPeriod === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => setSelectedPeriod(option.key)}
              style={[
                styles.periodChip,
                {
                  backgroundColor: active
                    ? paperTheme.colors.primary
                    : paperTheme.colors.surface,
                  borderColor: active
                    ? paperTheme.colors.primary
                    : paperTheme.colors.outlineVariant,
                },
                !active ? costCardShadow(resolvedTheme) : null,
              ]}
            >
              <Text
                style={[
                  styles.periodChipText,
                  {
                    color: active
                      ? paperTheme.colors.onPrimary
                      : paperTheme.colors.onSurface,
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={[
          styles.totalCard,
          {
            backgroundColor: paperTheme.colors.primary,
            borderColor: paperTheme.colors.primary,
          },
          costCardShadow(resolvedTheme),
        ]}
      >
        <Text style={[styles.totalLabel, { color: paperTheme.colors.onPrimary }]}>
          Total cost · {getPeriodLabel(selectedPeriod)}
        </Text>
        <Text style={[styles.totalAmount, { color: paperTheme.colors.onPrimary }]}>
          {formatCostAmount(total)}
        </Text>
        <Text style={[styles.totalHint, { color: paperTheme.colors.onPrimary, opacity: 0.85 }]}>
          Highest spend: {topCategory.name}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: paperTheme.colors.outlineVariant,
            },
            costCardShadow(resolvedTheme),
          ]}
        >
          <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            Categories
          </Text>
          <Text style={[styles.statValue, { color: paperTheme.colors.onSurface }]}>
            {categories.length}
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: paperTheme.colors.outlineVariant,
            },
            costCardShadow(resolvedTheme),
          ]}
        >
          <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            Avg / category
          </Text>
          <Text style={[styles.statValue, { color: paperTheme.colors.onSurface }]}>
            {formatCostAmount(Math.round(total / categories.length))}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        By category
      </Text>
      {categories.map((item) => (
        <View
          key={item.name}
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
              {getPeriodLabel(selectedPeriod)}
            </Text>
          </View>
          <Text style={[styles.listAmount, { color: paperTheme.colors.onSurface }]}>
            {formatCostAmount(item.amount)}
          </Text>
        </View>
      ))}

      <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Quick actions
      </Text>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: paperTheme.colors.outlineVariant,
            },
            costCardShadow(resolvedTheme),
          ]}
          onPress={() => showPlaceholderAction('Add category')}
        >
          <Ionicons name="folder-open-outline" size={18} color={paperTheme.colors.primary} />
          <Text style={[styles.actionBtnText, { color: paperTheme.colors.onSurface }]}>
            Add category
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnPrimary,
            { backgroundColor: paperTheme.colors.primary },
            costCardShadow(resolvedTheme),
          ]}
          onPress={() => showPlaceholderAction('Add new expense')}
        >
          <Ionicons name="add-circle-outline" size={18} color={paperTheme.colors.onPrimary} />
          <Text style={[styles.actionBtnText, { color: paperTheme.colors.onPrimary }]}>
            New expense
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
