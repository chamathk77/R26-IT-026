import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import DatePickerField from '../../../../components/DatePickerField/DatePickerField';
import { fonts } from '../../../../constants/fonts';
import KpiSalesPersonField from '../../shared/KpiSalesPersonField';
import { KpiMockSalePerson } from '../../shared/kpiMockData';
import { kpiCardShadow, kpiStyles } from '../../shared/kpiStyles';

type Props = {
  salePersons: KpiMockSalePerson[];
  selectedSalesPersonId: string | null;
  startDate: string;
  endDate: string;
  loading?: boolean;
  onSelectSalesPerson: (id: string | null) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onReset: () => void;
  onActionPress: () => void;
  paperTheme: MD3Theme;
  resolvedTheme: 'light' | 'dark';
};

function getTodayMaximumDate(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

export default function HistorySummaryFilterCard({
  salePersons,
  selectedSalesPersonId,
  startDate,
  endDate,
  loading = false,
  onSelectSalesPerson,
  onStartDateChange,
  onEndDateChange,
  onReset,
  onActionPress,
  paperTheme,
  resolvedTheme,
}: Props) {
  const todayMaximumDate = useMemo(() => getTodayMaximumDate(), []);

  const startMaximumDate = useMemo(() => {
    if (!endDate.trim()) return todayMaximumDate;
    const end = new Date(`${endDate}T23:59:59`);
    return end.getTime() < todayMaximumDate.getTime() ? end : todayMaximumDate;
  }, [endDate, todayMaximumDate]);

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
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: paperTheme.colors.onSurface }]}>Filters</Text>
        <TouchableOpacity
          onPress={onReset}
          disabled={loading}
          style={[styles.resetBtn, { backgroundColor: paperTheme.colors.secondaryContainer }]}
          accessibilityLabel="Reset filters"
        >
          <Ionicons name="refresh-outline" size={14} color={paperTheme.colors.onSecondaryContainer} />
        </TouchableOpacity>
      </View>

      <KpiSalesPersonField
        salePersons={salePersons}
        selectedSalesPersonId={selectedSalesPersonId}
        onSelect={onSelectSalesPerson}
        paperTheme={paperTheme}
        resolvedTheme={resolvedTheme}
        disabled={loading}
      />

      <View style={kpiStyles.dateFilterRow}>
        <DatePickerField
          label="Start"
          value={startDate}
          onChange={onStartDateChange}
          placeholder="Start"
          maximumDate={startMaximumDate}
          paperTheme={paperTheme}
        />
        <DatePickerField
          label="End"
          value={endDate}
          onChange={onEndDateChange}
          placeholder="End"
          minimumDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined}
          maximumDate={todayMaximumDate}
          paperTheme={paperTheme}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onActionPress}
        disabled={loading}
        style={[
          styles.actionBtn,
          {
            backgroundColor: paperTheme.colors.primary,
            opacity: loading ? 0.75 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
        ) : (
          <>
            <Ionicons name="search-outline" size={16} color={paperTheme.colors.onPrimary} />
            <Text style={[styles.actionBtnText, { color: paperTheme.colors.onPrimary }]}>
              Get history
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  resetBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
});
