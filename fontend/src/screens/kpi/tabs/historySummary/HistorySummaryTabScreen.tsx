import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Portal } from 'react-native-paper';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import SlideToast from '../../../../components/SlideToast/SlideToast';
import { formatDisplayDate } from '../../../../components/DatePickerField/DatePickerField';
import { useTheme } from '../../../../context/ThemeContext';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import {
  formatKpiAmount,
  getKpiSalePersonName,
  MOCK_KPI_HISTORY_ROWS,
  MOCK_KPI_SALE_PERSONS,
} from '../../shared/kpiMockData';
import { kpiCardShadow, kpiStyles } from '../../shared/kpiStyles';
import HistorySummaryFilterCard from './HistorySummaryFilterCard';
import { historySummaryTabStyles } from './historySummaryTabStyles';

export default function HistorySummaryTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [slideToastMessage, setSlideToastMessage] = useState<string | null>(null);

  const hasCompleteDateRange = Boolean(startDate.trim() && endDate.trim());
  const hasPartialDateRange = Boolean(
    (startDate.trim() && !endDate.trim()) || (!startDate.trim() && endDate.trim()),
  );

  const showSlideToast = useCallback((message: string) => {
    setSlideToastMessage(message);
  }, []);

  const hideSlideToast = useCallback(() => {
    setSlideToastMessage(null);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedSalesPersonId(null);
    setStartDate('');
    setEndDate('');
    setHistoryLoaded(false);
  }, []);

  const handleGetHistorySummary = useCallback(() => {
    if (startDate.trim() && !endDate.trim()) {
      showSlideToast('Select end date before getting history summary');
      return;
    }

    if (!startDate.trim() || !endDate.trim()) {
      showSlideToast('Select start date and end date');
      return;
    }

    if (!selectedSalesPersonId) {
      show_Alert(
        'error',
        'Sales person required',
        'Please select a sales person before loading the history summary.',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    setHistoryLoaded(true);
  }, [endDate, selectedSalesPersonId, showSlideToast, show_Alert, startDate]);

  const filterLabel = useMemo(() => {
    if (!hasCompleteDateRange) return '';
    return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
  }, [endDate, hasCompleteDateRange, startDate]);

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
        <HistorySummaryFilterCard
          selectedSalesPersonId={selectedSalesPersonId}
          startDate={startDate}
          endDate={endDate}
          onSelectSalesPerson={(id) => {
            setSelectedSalesPersonId(id);
            setHistoryLoaded(false);
          }}
          onStartDateChange={(value) => {
            setStartDate(value);
            setHistoryLoaded(false);
          }}
          onEndDateChange={(value) => {
            setEndDate(value);
            setHistoryLoaded(false);
          }}
          onReset={handleReset}
          onActionPress={handleGetHistorySummary}
          paperTheme={paperTheme}
          resolvedTheme={resolvedTheme}
        />

        {hasPartialDateRange ? (
          <View
            style={[
              historySummaryTabStyles.pendingBanner,
              {
                backgroundColor: paperTheme.colors.secondaryContainer,
                borderColor: `${paperTheme.colors.secondary}33`,
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={20} color={paperTheme.colors.secondary} />
            <Text
              style={[
                historySummaryTabStyles.pendingText,
                { color: paperTheme.colors.onSecondaryContainer },
              ]}
            >
              Select both start and end dates to load history summary.
            </Text>
          </View>
        ) : null}

        {!hasCompleteDateRange && !hasPartialDateRange ? (
          <View
            style={[
              historySummaryTabStyles.emptyState,
              {
                backgroundColor: paperTheme.colors.surfaceVariant,
                borderColor: paperTheme.colors.outlineVariant,
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={28} color={paperTheme.colors.onSurfaceVariant} />
            <Text style={[historySummaryTabStyles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
              Select date range
            </Text>
            <Text
              style={[historySummaryTabStyles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}
            >
              Choose a start date and end date along with a sales person to view history summary.
            </Text>
          </View>
        ) : null}

        {hasCompleteDateRange && historyLoaded ? (
          <View
            style={[
              historySummaryTabStyles.sectionCard,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              kpiCardShadow(resolvedTheme),
            ]}
          >
            <Text style={[historySummaryTabStyles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
              History summary
            </Text>
            <Text style={[historySummaryTabStyles.historyMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
              {filterLabel} · {selectedPersonName}
            </Text>

            {MOCK_KPI_HISTORY_ROWS.map((row, index) => (
              <View
                key={row.id}
                style={[
                  historySummaryTabStyles.historyRow,
                  {
                    borderBottomColor: paperTheme.colors.outlineVariant,
                    borderBottomWidth:
                      index === MOCK_KPI_HISTORY_ROWS.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={historySummaryTabStyles.historyBody}>
                  <Text style={[historySummaryTabStyles.historyOrder, { color: paperTheme.colors.onSurface }]}>
                    {row.orderId}
                  </Text>
                  <Text
                    style={[historySummaryTabStyles.historyMeta, { color: paperTheme.colors.onSurfaceVariant }]}
                  >
                    {formatDisplayDate(row.date)} · {row.customerName} · {row.paymentOption}
                  </Text>
                </View>
                <Text style={[historySummaryTabStyles.historyAmount, { color: paperTheme.colors.primary }]}>
                  {formatKpiAmount(row.amount)}
                </Text>
              </View>
            ))}
          </View>
        ) : hasCompleteDateRange ? (
          <View
            style={[
              historySummaryTabStyles.emptyState,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              kpiCardShadow(resolvedTheme),
            ]}
          >
            <Ionicons name="list-outline" size={28} color={paperTheme.colors.primary} />
            <Text style={[historySummaryTabStyles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
              Ready to load
            </Text>
            <Text
              style={[historySummaryTabStyles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}
            >
              Select a sales person and tap Get history summary to preview sales history for the chosen
              dates.
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
