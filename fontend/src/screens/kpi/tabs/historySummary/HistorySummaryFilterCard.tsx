import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import DatePickerField from '../../../../components/DatePickerField/DatePickerField';
import { fonts } from '../../../../constants/fonts';
import KpiSalesPersonField from '../../shared/KpiSalesPersonField';
import { kpiCardShadow, kpiStyles } from '../../shared/kpiStyles';

type Props = {
  selectedSalesPersonId: string | null;
  startDate: string;
  endDate: string;
  onSelectSalesPerson: (id: string | null) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onReset: () => void;
  onActionPress: () => void;
  paperTheme: MD3Theme;
  resolvedTheme: 'light' | 'dark';
};

export default function HistorySummaryFilterCard({
  selectedSalesPersonId,
  startDate,
  endDate,
  onSelectSalesPerson,
  onStartDateChange,
  onEndDateChange,
  onReset,
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
            Select a sales person and date range to load history summary.
          </Text>
        </View>
        <TouchableOpacity
          onPress={onReset}
          style={[styles.resetBtn, { backgroundColor: paperTheme.colors.secondaryContainer }]}
          accessibilityLabel="Reset filters"
        >
          <Ionicons name="refresh-outline" size={16} color={paperTheme.colors.onSecondaryContainer} />
          <Text style={[styles.resetText, { color: paperTheme.colors.onSecondaryContainer }]}>
            Reset
          </Text>
        </TouchableOpacity>
      </View>

      <KpiSalesPersonField
        selectedSalesPersonId={selectedSalesPersonId}
        onSelect={onSelectSalesPerson}
        paperTheme={paperTheme}
        resolvedTheme={resolvedTheme}
      />

      <Text style={[kpiStyles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Date range
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

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onActionPress}
        style={[styles.actionBtn, { backgroundColor: paperTheme.colors.primary }]}
      >
        <Ionicons name="time-outline" size={18} color={paperTheme.colors.onPrimary} />
        <Text style={[styles.actionBtnText, { color: paperTheme.colors.onPrimary }]}>
          Get history summary
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
