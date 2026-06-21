import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Portal } from 'react-native-paper';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import SlideToast from '../../../../components/SlideToast/SlideToast';
import { formatDisplayDate } from '../../../../components/DatePickerField/DatePickerField';
import { useTheme } from '../../../../context/ThemeContext';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import KpiFilterCard from '../../shared/KpiFilterCard';
import {
  formatKpiAmount,
  getKpiPeriodLabel,
  getKpiSalePersonName,
  MOCK_KPI_SALE_PERSONS,
  MOCK_KPI_SUMMARY,
} from '../../shared/kpiMockData';
import { kpiCardShadow, kpiStyles } from '../../shared/kpiStyles';
import { useKpiFilters } from '../../shared/useKpiFilters';
import { summaryTabStyles } from './summaryTabStyles';

function buildFilterLabel(
  isCustomRange: boolean,
  startDate: string,
  endDate: string,
  selectedPeriod: ReturnType<typeof useKpiFilters>['selectedPeriod'],
): string {
  if (isCustomRange) {
    return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
  }
  return getKpiPeriodLabel(selectedPeriod);
}

export default function SummaryTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string | null>(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [slideToastMessage, setSlideToastMessage] = useState<string | null>(null);

  const {
    selectedPeriod,
    startDate,
    endDate,
    isCustomRange,
    hasPartialCustomRange,
    hasActiveFilter,
    handleSelectPeriod,
    handleStartDateChange,
    handleEndDateChange,
    resetFilters,
  } = useKpiFilters();

  const showSlideToast = useCallback((message: string) => {
    setSlideToastMessage(message);
  }, []);

  const hideSlideToast = useCallback(() => {
    setSlideToastMessage(null);
  }, []);

  const handleReset = useCallback(() => {
    resetFilters();
    setSelectedSalesPersonId(null);
    setSummaryLoaded(false);
  }, [resetFilters]);

  const handleGetSummary = useCallback(() => {
    if (startDate.trim() && !endDate.trim()) {
      showSlideToast('Select end date before getting summary');
      return;
    }

    if (!hasActiveFilter) {
      return;
    }

    if (!selectedSalesPersonId) {
      show_Alert(
        'error',
        'Sales person required',
        'Please select a sales person before loading the summary.',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    setSummaryLoaded(true);
  }, [
    endDate,
    hasActiveFilter,
    selectedSalesPersonId,
    showSlideToast,
    show_Alert,
    startDate,
  ]);

  const filterLabel = useMemo(
    () => buildFilterLabel(isCustomRange, startDate, endDate, selectedPeriod),
    [endDate, isCustomRange, selectedPeriod, startDate],
  );

  const selectedPersonName = useMemo(() => {
    if (!selectedSalesPersonId) return '';
    const person = MOCK_KPI_SALE_PERSONS.find((item) => item._id === selectedSalesPersonId);
    return person ? getKpiSalePersonName(person) : '';
  }, [selectedSalesPersonId]);

  return (
    <>
      <ScrollView
        style={kpiStyles.tabContent}
        contentContainerStyle={kpiStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <KpiFilterCard
          selectedPeriod={selectedPeriod}
          startDate={startDate}
          endDate={endDate}
          isCustomRange={isCustomRange}
          hasPartialCustomRange={hasPartialCustomRange}
          selectedSalesPersonId={selectedSalesPersonId}
          onSelectPeriod={handleSelectPeriod}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onSelectSalesPerson={(id) => {
            setSelectedSalesPersonId(id);
            setSummaryLoaded(false);
          }}
          onReset={handleReset}
          actionLabel="Get summary"
          actionIcon="stats-chart-outline"
          onActionPress={handleGetSummary}
          paperTheme={paperTheme}
          resolvedTheme={resolvedTheme}
        />

        {hasPartialCustomRange ? (
          <View
            style={[
              summaryTabStyles.pendingBanner,
              {
                backgroundColor: paperTheme.colors.secondaryContainer,
                borderColor: `${paperTheme.colors.secondary}33`,
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={20} color={paperTheme.colors.secondary} />
            <Text
              style={[summaryTabStyles.pendingText, { color: paperTheme.colors.onSecondaryContainer }]}
            >
              Select both start and end dates, or choose a preset period above.
            </Text>
          </View>
        ) : null}

        {!hasActiveFilter ? (
          <View
            style={[
              summaryTabStyles.emptyState,
              {
                backgroundColor: paperTheme.colors.surfaceVariant,
                borderColor: paperTheme.colors.outlineVariant,
              },
            ]}
          >
            <Ionicons name="filter-outline" size={28} color={paperTheme.colors.onSurfaceVariant} />
            <Text style={[summaryTabStyles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
              Select a filter
            </Text>
            <Text style={[summaryTabStyles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Choose this month, last month, last 3 months, or a complete custom date range to view
              KPI summary.
            </Text>
          </View>
        ) : null}

        {hasActiveFilter && summaryLoaded ? (
          <View
            style={[
              summaryTabStyles.heroCard,
              {
                backgroundColor: paperTheme.colors.primaryContainer,
                borderColor: `${paperTheme.colors.primary}33`,
              },
              kpiCardShadow(resolvedTheme),
            ]}
          >
            <View style={[summaryTabStyles.heroAccent, { backgroundColor: paperTheme.colors.primary }]} />
            <Text style={[summaryTabStyles.heroEyebrow, { color: paperTheme.colors.onPrimaryContainer }]}>
              KPI summary
            </Text>
            <Text style={[summaryTabStyles.heroTitle, { color: paperTheme.colors.primary }]}>
              {formatKpiAmount(MOCK_KPI_SUMMARY.totalSales)}
            </Text>
            <Text style={[summaryTabStyles.heroSub, { color: paperTheme.colors.onPrimaryContainer }]}>
              {filterLabel} · {selectedPersonName}
            </Text>

            <View style={summaryTabStyles.statsGrid}>
              <View
                style={[
                  summaryTabStyles.statCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
              >
                <Text style={[summaryTabStyles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Orders
                </Text>
                <Text style={[summaryTabStyles.statValue, { color: paperTheme.colors.onSurface }]}>
                  {MOCK_KPI_SUMMARY.orderCount}
                </Text>
              </View>
              <View
                style={[
                  summaryTabStyles.statCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
              >
                <Text style={[summaryTabStyles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Avg. order
                </Text>
                <Text style={[summaryTabStyles.statValue, { color: paperTheme.colors.onSurface }]}>
                  {formatKpiAmount(MOCK_KPI_SUMMARY.averageOrderValue)}
                </Text>
              </View>
              <View
                style={[
                  summaryTabStyles.statCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
              >
                <Text style={[summaryTabStyles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Items sold
                </Text>
                <Text style={[summaryTabStyles.statValue, { color: paperTheme.colors.onSurface }]}>
                  {MOCK_KPI_SUMMARY.itemsSold}
                </Text>
              </View>
              <View
                style={[
                  summaryTabStyles.statCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
              >
                <Text style={[summaryTabStyles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Top payment
                </Text>
                <Text style={[summaryTabStyles.statValue, { color: paperTheme.colors.onSurface }]}>
                  {MOCK_KPI_SUMMARY.topPaymentMethod}
                </Text>
              </View>
            </View>
          </View>
        ) : hasActiveFilter ? (
          <View
            style={[
              summaryTabStyles.emptyState,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              kpiCardShadow(resolvedTheme),
            ]}
          >
            <Ionicons name="analytics-outline" size={28} color={paperTheme.colors.primary} />
            <Text style={[summaryTabStyles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
              Ready to load
            </Text>
            <Text style={[summaryTabStyles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Select a sales person and tap Get summary to preview KPI metrics for the chosen period.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <SlideToast
        message={slideToastMessage}
        onDismiss={hideSlideToast}
        paperTheme={paperTheme}
      />

      {alertConfig ? (
        <Portal>
          <CommonAlert
            visible={visible}
            type={alertConfig.type}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={alertConfig.buttons}
            positiveButtonText={alertConfig.positiveButtonText}
            negativeButtonText={alertConfig.negativeButtonText}
            onPositivePress={alertConfig.onPositivePress}
            onNegativePress={alertConfig.onNegativePress}
            onClose={hideAlert}
            MoreDetails={alertConfig.MoreDetails}
            OtherDescirption={alertConfig.OtherDescirption}
            OtherButtonPress={alertConfig.OtherButtonPress}
            OtherButtonText={alertConfig.OtherButtonText}
          />
        </Portal>
      ) : null}
    </>
  );
}
