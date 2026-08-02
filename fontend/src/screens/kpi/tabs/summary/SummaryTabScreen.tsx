import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { KpiSalesPersonSummary, KpiUnassignedOrder } from '../../../../type/kpi';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../utils/apiErrorAlert';
import KpiFilterCard from '../../shared/KpiFilterCard';
import { formatKpiAmount } from '../../shared/kpiMockData';
import { getKpiPeriodLabel } from '../../shared/kpiPeriodOptions';
import { kpiCardShadow, kpiStyles } from '../../shared/kpiStyles';
import { KpiSummarySkeleton } from '../../shared/kpiSkeletonComponents';
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
  const isTopPerformer = rank <= 3;
  const accent = isTopPerformer ? paperTheme.colors.primary : paperTheme.colors.onSurfaceVariant;
  const initials = person.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const avgSale =
    person.workCount > 0 ? person.totalSalesAmount / person.workCount : 0;

  return (
    <View
      style={[
        summaryTabStyles.personCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: isTopPerformer
            ? `${paperTheme.colors.primary}40`
            : paperTheme.colors.outlineVariant,
        },
        kpiCardShadow(resolvedTheme),
      ]}
    >
      <View style={summaryTabStyles.personCardInner}>
        <View style={summaryTabStyles.personTopRow}>
          <View
            style={[
              summaryTabStyles.personRankBadge,
              {
                backgroundColor: isTopPerformer
                  ? paperTheme.colors.primaryContainer
                  : paperTheme.colors.surfaceVariant,
              },
            ]}
          >
            <Text
              style={[
                summaryTabStyles.personRankText,
                {
                  color: isTopPerformer
                    ? paperTheme.colors.primary
                    : paperTheme.colors.onSurfaceVariant,
                },
              ]}
            >
              {rank}
            </Text>
          </View>

          <View
            style={[
              summaryTabStyles.personAvatar,
              {
                backgroundColor: isTopPerformer
                  ? `${paperTheme.colors.primary}14`
                  : paperTheme.colors.surfaceVariant,
              },
            ]}
          >
            <Text
              style={[
                summaryTabStyles.personAvatarText,
                { color: isTopPerformer ? paperTheme.colors.primary : paperTheme.colors.onSurface },
              ]}
            >
              {initials || '?'}
            </Text>
          </View>

          <View style={summaryTabStyles.personBody}>
            <Text
              style={[summaryTabStyles.personName, { color: paperTheme.colors.onSurface }]}
              numberOfLines={1}
            >
              {person.fullName}
            </Text>
            <Text
              style={[summaryTabStyles.personMeta, { color: paperTheme.colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {person.salePersonId ? `ID ${person.salePersonId}` : 'No staff ID'}
              {person.position ? ` · ${person.position}` : ''}
            </Text>
          </View>

          <View style={summaryTabStyles.personAmountBlock}>
            <Text style={[summaryTabStyles.personAmount, { color: accent }]}>
              {formatKpiAmount(person.totalSalesAmount)}
            </Text>
            <Text
              style={[summaryTabStyles.personAmountLabel, { color: paperTheme.colors.onSurfaceVariant }]}
            >
              Total sales
            </Text>
          </View>
        </View>

        <View
          style={[
            summaryTabStyles.personStatsRow,
            { borderTopColor: paperTheme.colors.outlineVariant },
          ]}
        >
          <View style={summaryTabStyles.personStatItem}>
            <Ionicons name="bag-check-outline" size={14} color={paperTheme.colors.onSurfaceVariant} />
            <Text style={[summaryTabStyles.personStatValue, { color: paperTheme.colors.onSurface }]}>
              {person.workCount}
            </Text>
            <Text style={[summaryTabStyles.personStatLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
              Orders
            </Text>
          </View>
          <View
            style={[summaryTabStyles.personStatDivider, { backgroundColor: paperTheme.colors.outlineVariant }]}
          />
          <View style={summaryTabStyles.personStatItem}>
            <Ionicons name="trending-up-outline" size={14} color={paperTheme.colors.onSurfaceVariant} />
            <Text style={[summaryTabStyles.personStatValue, { color: paperTheme.colors.onSurface }]}>
              {formatKpiAmount(avgSale)}
            </Text>
            <Text style={[summaryTabStyles.personStatLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
              Avg. sale
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function UnassignedOrderCard({
  order,
  paperTheme,
  resolvedTheme,
  onPress,
}: {
  order: KpiUnassignedOrder;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
  onPress: () => void;
}) {
  const accent = paperTheme.colors.tertiary;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        summaryTabStyles.unassignedOrderCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        kpiCardShadow(resolvedTheme),
      ]}
    >
      <View style={summaryTabStyles.unassignedOrderRow}>
        <View
          style={[
            summaryTabStyles.unassignedOrderIcon,
            { backgroundColor: `${accent}18` },
          ]}
        >
          <Ionicons name="receipt-outline" size={18} color={accent} />
        </View>

        <View style={summaryTabStyles.personBody}>
          <Text
            style={[summaryTabStyles.unassignedOrderId, { color: paperTheme.colors.onSurface }]}
            numberOfLines={1}
          >
            {order.orderId}
          </Text>
          <Text
            style={[summaryTabStyles.personMeta, { color: paperTheme.colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {formatDisplayDate(order.checkOutTime.slice(0, 10))} · Tap to assign
          </Text>
        </View>

        <View style={summaryTabStyles.unassignedOrderTrailing}>
          <Text style={[summaryTabStyles.unassignedOrderAmount, { color: paperTheme.colors.onSurface }]}>
            {formatKpiAmount(order.totalAmount)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={paperTheme.colors.onSurfaceVariant} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SummaryTabScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const { loading, data, error } = useSelector((state: RootState) => state.KpiReducer.summary);
  const [slideToastMessage, setSlideToastMessage] = useState<string | null>(null);
  const hasLoadedSummaryRef = useRef(false);

  useEffect(() => {
    hasLoadedSummaryRef.current = Boolean(data);
  }, [data]);

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

  useFocusEffect(
    useCallback(() => {
      if (hasActiveFilter && hasLoadedSummaryRef.current) {
        void loadSummary();
      }
    }, [hasActiveFilter, loadSummary]),
  );

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
          <KpiSummarySkeleton
            boneColor={paperTheme.colors.surfaceVariant}
            cardColor={paperTheme.colors.surface}
            borderColor={paperTheme.colors.outlineVariant}
          />
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

            <View style={summaryTabStyles.teamSection}>
              <View style={summaryTabStyles.teamSectionHeader}>
                <Text
                  style={[summaryTabStyles.teamSectionTitle, { color: paperTheme.colors.onSurface }]}
                >
                  Sales team performance
                </Text>
                <Text
                  style={[
                    summaryTabStyles.teamSectionSub,
                    { color: paperTheme.colors.onSurfaceVariant },
                  ]}
                >
                  {salesPersons.length} member{salesPersons.length === 1 ? '' : 's'} · ranked by sales
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
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={28}
                    color={paperTheme.colors.onSurfaceVariant}
                  />
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
            </View>

            {(unassignedSales?.count ?? 0) > 0 ? (
              <View style={summaryTabStyles.unassignedSection}>
                <View style={summaryTabStyles.teamSectionHeader}>
                  <Text
                    style={[summaryTabStyles.teamSectionTitle, { color: paperTheme.colors.onSurface }]}
                  >
                    Unassigned sales
                  </Text>
                  <Text
                    style={[
                      summaryTabStyles.teamSectionSub,
                      { color: paperTheme.colors.onSurfaceVariant },
                    ]}
                  >
                    {unassignedSales?.count} order{(unassignedSales?.count ?? 0) === 1 ? '' : 's'} ·{' '}
                    {formatKpiAmount(unassignedSales?.totalSalesAmount ?? 0)} total · tap to assign
                  </Text>
                </View>

                {(unassignedSales?.orders ?? []).map((order) => (
                  <UnassignedOrderCard
                    key={`${order.orderId}-${order.checkOutTime}`}
                    order={order}
                    paperTheme={paperTheme}
                    resolvedTheme={resolvedTheme}
                    onPress={() =>
                      navigation.navigate('KpiUnassignedOrderDetail', {
                        orderId: order.orderId,
                      })
                    }
                  />
                ))}
              </View>
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
