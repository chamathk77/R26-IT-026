import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import SlideToast from '../../../../components/SlideToast/SlideToast';
import { formatDisplayDate } from '../../../../components/DatePickerField/DatePickerField';
import { useTheme } from '../../../../context/ThemeContext';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import { fetchKpiSummary_Service } from '../../../../services/KpiService';
import { AppDispatch, RootState } from '../../../../store/store';
import { resetKpiSummary } from '../../../../store/reducers/KpiReducer';
import { KpiSalesPersonSummary } from '../../../../type/kpi';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../utils/apiErrorAlert';
import KpiFilterCard from '../../shared/KpiFilterCard';
import { formatKpiAmount } from '../../shared/kpiMockData';
import { getKpiPeriodLabel } from '../../shared/kpiPeriodOptions';
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

function SummaryStatChip({
  icon,
  label,
  value,
  tint,
  paperTheme,
  resolvedTheme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint: string;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  return (
    <View
      style={[
        summaryTabStyles.statChip,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        kpiCardShadow(resolvedTheme),
      ]}
    >
      <View style={[summaryTabStyles.statIconWrap, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[summaryTabStyles.statChipLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text style={[summaryTabStyles.statChipValue, { color: paperTheme.colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
}

function SalesPersonCard({
  person,
  rank,
  paperTheme,
  resolvedTheme,
}: {
  person: KpiSalesPersonSummary;
  rank: number;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  const rankTint =
    rank === 1 ? '#b45309' : rank === 2 ? '#64748b' : rank === 3 ? '#92400e' : paperTheme.colors.primary;

  return (
    <View
      style={[
        summaryTabStyles.personCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        kpiCardShadow(resolvedTheme),
      ]}
    >
      <View style={summaryTabStyles.personTopRow}>
        <View style={[summaryTabStyles.rankBadge, { backgroundColor: `${rankTint}18` }]}>
          <Text style={[summaryTabStyles.rankText, { color: rankTint }]}>#{rank}</Text>
        </View>
        <View style={summaryTabStyles.personBody}>
          <Text style={[summaryTabStyles.personName, { color: paperTheme.colors.onSurface }]}>
            {person.fullName}
          </Text>
          <Text style={[summaryTabStyles.personMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
            {person.salePersonId ? `ID ${person.salePersonId}` : 'No staff ID'}
            {person.position ? ` · ${person.position}` : ''}
          </Text>
        </View>
        <Text style={[summaryTabStyles.personAmount, { color: paperTheme.colors.primary }]}>
          {formatKpiAmount(person.totalSalesAmount)}
        </Text>
      </View>

      <View style={summaryTabStyles.personStatsRow}>
        <View
          style={[
            summaryTabStyles.personStatPill,
            { backgroundColor: paperTheme.colors.primaryContainer },
          ]}
        >
          <Text
            style={[
              summaryTabStyles.personStatLabel,
              { color: paperTheme.colors.onPrimaryContainer },
            ]}
          >
            Works done
          </Text>
          <Text
            style={[
              summaryTabStyles.personStatValue,
              { color: paperTheme.colors.onPrimaryContainer },
            ]}
          >
            {person.workCount}
          </Text>
        </View>
        <View
          style={[
            summaryTabStyles.personStatPill,
            { backgroundColor: paperTheme.colors.secondaryContainer },
          ]}
        >
          <Text
            style={[
              summaryTabStyles.personStatLabel,
              { color: paperTheme.colors.onSecondaryContainer },
            ]}
          >
            Avg. sale
          </Text>
          <Text
            style={[
              summaryTabStyles.personStatValue,
              { color: paperTheme.colors.onSecondaryContainer },
            ]}
          >
            {formatKpiAmount(
              person.workCount > 0 ? person.totalSalesAmount / person.workCount : 0,
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function SummaryTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const { loading, data, error } = useSelector((state: RootState) => state.KpiReducer.summary);
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
    dispatch(resetKpiSummary());
  }, [dispatch, resetFilters]);

  const loadSummary = useCallback(async () => {
    if (startDate.trim() && !endDate.trim()) {
      showSlideToast('Select end date before getting summary');
      return;
    }

    if (!hasActiveFilter) {
      return;
    }

    const params = isCustomRange
      ? { startDate: startDate.trim(), endDate: endDate.trim() }
      : { period: selectedPeriod ?? 'this_month' };

    try {
      await dispatch(fetchKpiSummary_Service(params)).unwrap();
    } catch (err: unknown) {
      const handled = await handleSessionExpiredApiError(err, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Load failed',
        getApiErrorMessage(err, 'Could not load KPI summary. Please try again.'),
        2,
        false,
        'Retry',
        () => {
          void loadSummary();
        },
        'Cancel',
        () => {},
      );
    }
  }, [
    dispatch,
    endDate,
    hasActiveFilter,
    isCustomRange,
    selectedPeriod,
    showSlideToast,
    show_Alert,
    startDate,
  ]);

  const filterLabel = useMemo(
    () => buildFilterLabel(isCustomRange, startDate, endDate, selectedPeriod),
    [endDate, isCustomRange, selectedPeriod, startDate],
  );

  const salesPersons = data?.salesPersons ?? [];
  const unassignedSales = data?.unassignedSales;
  const showResults = Boolean(data) && hasActiveFilter;

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
          onSelectPeriod={(key) => {
            handleSelectPeriod(key);
            dispatch(resetKpiSummary());
          }}
          onStartDateChange={(value) => {
            handleStartDateChange(value);
            dispatch(resetKpiSummary());
          }}
          onEndDateChange={(value) => {
            handleEndDateChange(value);
            dispatch(resetKpiSummary());
          }}
          onReset={handleReset}
          actionLabel="Get summary"
          actionIcon="stats-chart-outline"
          onActionPress={() => {
            void loadSummary();
          }}
          loading={loading}
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

        {loading && !data ? (
          <View style={summaryTabStyles.loadingWrap}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text style={[summaryTabStyles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading KPI summary...
            </Text>
          </View>
        ) : null}

        {error && !loading ? (
          <View
            style={[
              summaryTabStyles.emptyState,
              {
                backgroundColor: paperTheme.colors.errorContainer,
                borderColor: `${paperTheme.colors.error}33`,
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={28} color={paperTheme.colors.error} />
            <Text style={[summaryTabStyles.emptyTitle, { color: paperTheme.colors.error }]}>
              Could not load summary
            </Text>
            <Text style={[summaryTabStyles.emptyText, { color: paperTheme.colors.onErrorContainer }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {showResults && data ? (
          <>
            <View
              style={[
                summaryTabStyles.heroCard,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: `${paperTheme.colors.primary}33`,
                },
                kpiCardShadow(resolvedTheme),
              ]}
            >
              <View style={[summaryTabStyles.heroAccent, { backgroundColor: paperTheme.colors.primary }]} />
              <View
                style={[summaryTabStyles.heroAccentSecondary, { backgroundColor: paperTheme.colors.tertiary }]}
              />

              <View style={summaryTabStyles.heroTopRow}>
                <View style={summaryTabStyles.heroTitleBlock}>
                  <Text style={[summaryTabStyles.heroEyebrow, { color: paperTheme.colors.primary }]}>
                    KPI summary
                  </Text>
                  <Text style={[summaryTabStyles.heroTitle, { color: paperTheme.colors.onSurface }]}>
                    {filterLabel}
                  </Text>
                  <Text style={[summaryTabStyles.heroSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                    {data.orderCount} order{data.orderCount === 1 ? '' : 's'} · {salesPersons.length} sales
                    person{salesPersons.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <View
                  style={[
                    summaryTabStyles.heroIconWrap,
                    {
                      backgroundColor: `${paperTheme.colors.primary}14`,
                      borderColor: `${paperTheme.colors.primary}33`,
                    },
                  ]}
                >
                  <Ionicons name="stats-chart-outline" size={24} color={paperTheme.colors.primary} />
                </View>
              </View>

              <View
                style={[
                  summaryTabStyles.heroAmountPanel,
                  {
                    backgroundColor: `${paperTheme.colors.primary}10`,
                    borderColor: `${paperTheme.colors.primary}22`,
                  },
                ]}
              >
                <Text
                  style={[summaryTabStyles.heroAmountLabel, { color: paperTheme.colors.onSurfaceVariant }]}
                >
                  Total sales
                </Text>
                <Text style={[summaryTabStyles.heroAmountValue, { color: paperTheme.colors.primary }]}>
                  {formatKpiAmount(data.totalSales)}
                </Text>
              </View>
            </View>

            <View style={summaryTabStyles.statGrid}>
              <SummaryStatChip
                icon="receipt-outline"
                label="Orders"
                value={String(data.orderCount)}
                tint={paperTheme.colors.primary}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
              />
              <SummaryStatChip
                icon="people-outline"
                label="Sales persons"
                value={String(salesPersons.length)}
                tint={paperTheme.colors.secondary}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
              />
              <SummaryStatChip
                icon="help-circle-outline"
                label="Unassigned"
                value={String(unassignedSales?.count ?? 0)}
                tint={paperTheme.colors.tertiary}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
              />
              <SummaryStatChip
                icon="cash-outline"
                label="Unassigned sales"
                value={formatKpiAmount(unassignedSales?.totalSalesAmount ?? 0)}
                tint="#b45309"
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
              />
            </View>

            <View style={summaryTabStyles.sectionHeader}>
              <Text style={[summaryTabStyles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                Sales team performance
              </Text>
              <Text
                style={[summaryTabStyles.sectionCount, { color: paperTheme.colors.onSurfaceVariant }]}
              >
                {salesPersons.length} member{salesPersons.length === 1 ? '' : 's'}
              </Text>
            </View>

            {salesPersons.length === 0 ? (
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
                <Ionicons name="people-outline" size={28} color={paperTheme.colors.onSurfaceVariant} />
                <Text style={[summaryTabStyles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
                  No assigned sales
                </Text>
                <Text
                  style={[summaryTabStyles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}
                >
                  No sales in this period were linked to a sales person.
                </Text>
              </View>
            ) : (
              salesPersons.map((person, index) => (
                <SalesPersonCard
                  key={person.salesPersonId}
                  person={person}
                  rank={index + 1}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />
              ))
            )}

            {(unassignedSales?.count ?? 0) > 0 ? (
              <>
                <View style={summaryTabStyles.sectionHeader}>
                  <Text style={[summaryTabStyles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                    Unassigned sales
                  </Text>
                  <Text
                    style={[summaryTabStyles.sectionCount, { color: paperTheme.colors.onSurfaceVariant }]}
                  >
                    {unassignedSales?.count} order{(unassignedSales?.count ?? 0) === 1 ? '' : 's'}
                  </Text>
                </View>

                <View
                  style={[
                    summaryTabStyles.unassignedCard,
                    {
                      backgroundColor: paperTheme.colors.surface,
                      borderColor: paperTheme.colors.outlineVariant,
                    },
                    kpiCardShadow(resolvedTheme),
                  ]}
                >
                  <Text
                    style={[summaryTabStyles.personMeta, { color: paperTheme.colors.onSurfaceVariant }]}
                  >
                    Total unassigned: {formatKpiAmount(unassignedSales?.totalSalesAmount ?? 0)}
                  </Text>

                  {(unassignedSales?.orders ?? []).map((order, index, list) => (
                    <View
                      key={`${order.orderId}-${order.checkOutTime}`}
                      style={[
                        summaryTabStyles.orderRow,
                        {
                          borderBottomColor: paperTheme.colors.outlineVariant,
                          borderBottomWidth:
                            index === list.length - 1 ? 0 : StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[summaryTabStyles.orderId, { color: paperTheme.colors.onSurface }]}>
                          {order.orderId}
                        </Text>
                        <Text
                          style={[
                            summaryTabStyles.personMeta,
                            { color: paperTheme.colors.onSurfaceVariant },
                          ]}
                        >
                          {formatDisplayDate(order.checkOutTime.slice(0, 10))}
                        </Text>
                      </View>
                      <Text style={[summaryTabStyles.orderAmount, { color: paperTheme.colors.primary }]}>
                        {formatKpiAmount(order.totalAmount)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : hasActiveFilter && !loading && !data && !error ? (
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
              Tap Get summary to load KPI metrics for the selected period.
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
