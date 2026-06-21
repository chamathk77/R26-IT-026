import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import DatePickerField from '../../../components/DatePickerField/DatePickerField';
import { fonts } from '../../../constants/fonts';
import { KPI_PERIOD_OPTIONS, KpiPeriodKey } from './kpiMockData';
import KpiSalesPersonField from './KpiSalesPersonField';
import { kpiCardShadow, kpiStyles } from './kpiStyles';

type Props = {
  selectedPeriod: KpiPeriodKey | null;
  startDate: string;
  endDate: string;
  isCustomRange: boolean;
  hasPartialCustomRange: boolean;
  selectedSalesPersonId: string | null;
  onSelectPeriod: (key: KpiPeriodKey) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSelectSalesPerson: (id: string | null) => void;
  onReset: () => void;
  actionLabel: string;
  actionIcon: keyof typeof Ionicons.glyphMap;
  onActionPress: () => void;
  paperTheme: MD3Theme;
  resolvedTheme: 'light' | 'dark';
};

export default function KpiFilterCard({
  selectedPeriod,
  startDate,
  endDate,
  isCustomRange,
  hasPartialCustomRange,
  selectedSalesPersonId,
  onSelectPeriod,
  onStartDateChange,
  onEndDateChange,
  onSelectSalesPerson,
  onReset,
  actionLabel,
  actionIcon,
  onActionPress,
  paperTheme,
  resolvedTheme,
}: Props) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        kpiCardShadow(resolvedTheme),
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: paperTheme.colors.onSurface }]}>Filters</Text>
          <Text style={[styles.hint, { color: paperTheme.colors.onSurfaceVariant }]}>
            Choose a period, sales person, then load the summary.
          </Text>
        </View>
        <TouchableOpacity
          onPress={onReset}
          style={[styles.resetBtn, { backgroundColor: paperTheme.colors.secondaryContainer }]}
          accessibilityLabel="Reset filters to this month"
        >
          <Ionicons name="refresh-outline" size={16} color={paperTheme.colors.onSecondaryContainer} />
          <Text style={[styles.resetText, { color: paperTheme.colors.onSecondaryContainer }]}>
            Reset
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.groupLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Filter period
      </Text>

      <View style={kpiStyles.periodRow}>
        {KPI_PERIOD_OPTIONS.map((option) => {
          const active =
            !isCustomRange && !hasPartialCustomRange && selectedPeriod === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => onSelectPeriod(option.key)}
              style={[
                kpiStyles.periodChip,
                {
                  backgroundColor: active
                    ? paperTheme.colors.primary
                    : paperTheme.colors.background,
                  borderColor: active
                    ? paperTheme.colors.primary
                    : paperTheme.colors.outlineVariant,
                },
              ]}
            >
              <Text
                style={[
                  kpiStyles.periodChipText,
                  {
                    color: active ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface,
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[kpiStyles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Custom range
      </Text>
      <View style={kpiStyles.dateFilterRow}>
        <DatePickerField
          label="Start date"
          value={startDate}
          onChange={onStartDateChange}
          placeholder="Select start"
          maximumDate={endDate ? new Date(`${endDate}T23:59:59`) : undefined}
          paperTheme={paperTheme}
        />
        <DatePickerField
          label="End date"
          value={endDate}
          onChange={onEndDateChange}
          placeholder="Select end"
          minimumDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined}
          paperTheme={paperTheme}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: paperTheme.colors.outlineVariant }]} />

      <KpiSalesPersonField
        selectedSalesPersonId={selectedSalesPersonId}
        onSelect={onSelectSalesPerson}
        paperTheme={paperTheme}
        resolvedTheme={resolvedTheme}
      />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onActionPress}
        style={[styles.actionBtn, { backgroundColor: paperTheme.colors.primary }]}
      >
        <Ionicons name={actionIcon} size={18} color={paperTheme.colors.onPrimary} />
        <Text style={[styles.actionBtnText, { color: paperTheme.colors.onPrimary }]}>
          {actionLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  hint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  groupLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginLeft: 2,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resetText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  actionBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
});
