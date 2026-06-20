import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../context/ThemeContext';
import DatePickerField, { formatDisplayDate } from '../../../../../components/DatePickerField/DatePickerField';
import {
  costCardShadow,
  costDashboardStyles as styles,
} from '../../shared/costDashboardStyles';
import {
  COST_TOTALS_BY_PERIOD,
  CostPeriodKey,
  formatCostAmount,
  getSummaryCategoryBreakdown,
  getSummaryPeriodLabel,
  SUMMARY_PERIOD_OPTIONS,
} from '../../shared/costDashboardMockData';

export default function SummaryTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<CostPeriodKey | null>('current_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isCustomRange = Boolean(startDate.trim() && endDate.trim());

  const handleSelectPeriod = (key: CostPeriodKey) => {
    setSelectedPeriod(key);
    setStartDate('');
    setEndDate('');
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value.trim()) {
      setSelectedPeriod(null);
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (value.trim()) {
      setSelectedPeriod(null);
    }
  };

  const { total, subtitle, categories } = useMemo(() => {
    if (isCustomRange) {
      const rows = getSummaryCategoryBreakdown(null, true);
      return {
        total: rows.reduce((sum, row) => sum + row.amount, 0),
        subtitle: `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`,
        categories: rows,
      };
    }
    const period = selectedPeriod ?? 'current_month';
    const rows = getSummaryCategoryBreakdown(period, false);
    return {
      total: COST_TOTALS_BY_PERIOD[period],
      subtitle: getSummaryPeriodLabel(period),
      categories: rows,
    };
  }, [endDate, isCustomRange, selectedPeriod, startDate]);

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Period
      </Text>
      <View style={styles.periodRow}>
        {SUMMARY_PERIOD_OPTIONS.map((option) => {
          const active = !isCustomRange && selectedPeriod === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => handleSelectPeriod(option.key)}
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

      <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Custom range
      </Text>
      <View style={styles.dateFilterRow}>
        <DatePickerField
          label="Start date"
          value={startDate}
          onChange={handleStartDateChange}
          placeholder="Select start"
          maximumDate={endDate ? new Date(`${endDate}T23:59:59`) : undefined}
          paperTheme={paperTheme}
        />
        <DatePickerField
          label="End date"
          value={endDate}
          onChange={handleEndDateChange}
          placeholder="Select end"
          minimumDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined}
          paperTheme={paperTheme}
        />
      </View>
      {isCustomRange ? (
        <TouchableOpacity
          onPress={() => {
            setStartDate('');
            setEndDate('');
            setSelectedPeriod('current_month');
          }}
          style={styles.clearRangeBtn}
        >
          <Ionicons name="close-circle-outline" size={16} color={paperTheme.colors.error} />
          <Text style={[styles.clearRangeText, { color: paperTheme.colors.error }]}>
            Clear date range
          </Text>
        </TouchableOpacity>
      ) : null}

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
          Total cost
        </Text>
        <Text style={[styles.totalAmount, { color: paperTheme.colors.onPrimary }]}>
          {formatCostAmount(total)}
        </Text>
        <Text style={[styles.totalHint, { color: paperTheme.colors.onPrimary, opacity: 0.85 }]}>
          {subtitle}
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        By category · {subtitle}
      </Text>
      {categories.map((item) => (
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
              {item.expenseCount} expense{item.expenseCount === 1 ? '' : 's'}
            </Text>
          </View>
          <Text style={[styles.listAmount, { color: paperTheme.colors.onSurface }]}>
            {formatCostAmount(item.amount)}
          </Text>
        </View>
      ))}

      {categories.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="folder-open-outline" size={36} color={paperTheme.colors.outline} />
          <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
            No expenses found
          </Text>
          <Text style={[styles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
            Try a different period or date range.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
