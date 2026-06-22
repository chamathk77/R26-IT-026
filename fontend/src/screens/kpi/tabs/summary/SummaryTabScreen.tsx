import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { KpiSalesPersonSummary } from '../../../../type/kpi';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
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

function getSalesPersonCardTheme(rank: number, resolvedTheme: 'light' | 'dark') {
  const palettes = [
    {
      accent: '#d97706',
      cardBg: resolvedTheme === 'dark' ? '#422006' : '#fffbeb',
      border: '#f59e0b',
      badgeBg: '#fef3c7',
      badgeText: '#b45309',
      amountBg: '#fef3c7',
      amountText: '#92400e',
      statA: { bg: '#ffedd5', border: '#fdba74', text: '#c2410c' },
      statB: { bg: '#fef9c3', border: '#fde047', text: '#a16207' },
    },
    {
      accent: '#475569',
      cardBg: resolvedTheme === 'dark' ? '#1e293b' : '#f8fafc',
      border: '#94a3b8',
      badgeBg: '#e2e8f0',
      badgeText: '#334155',
      amountBg: '#e2e8f0',
      amountText: '#1e293b',
      statA: { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' },
      statB: { bg: '#e2e8f0', border: '#94a3b8', text: '#334155' },
    },
    {
      accent: '#b45309',
      cardBg: resolvedTheme === 'dark' ? '#431407' : '#fff7ed',
      border: '#fb923c',
      badgeBg: '#ffedd5',
      badgeText: '#c2410c',
      amountBg: '#ffedd5',
      amountText: '#9a3412',
      statA: { bg: '#ffedd5', border: '#fdba74', text: '#c2410c' },
      statB: { bg: '#fef3c7', border: '#fcd34d', text: '#b45309' },
    },
    {
      accent: '#2563eb',
      cardBg: resolvedTheme === 'dark' ? '#172554' : '#eff6ff',
      border: '#60a5fa',
      badgeBg: '#dbeafe',
      badgeText: '#1d4ed8',
      amountBg: '#dbeafe',
      amountText: '#1e40af',
      statA: { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' },
      statB: { bg: '#e0e7ff', border: '#a5b4fc', text: '#4338ca' },
    },
    {
      accent: '#059669',
      cardBg: resolvedTheme === 'dark' ? '#064e3b' : '#ecfdf5',
      border: '#34d399',
      badgeBg: '#d1fae5',
      badgeText: '#047857',
      amountBg: '#d1fae5',
      amountText: '#065f46',
      statA: { bg: '#d1fae5', border: '#6ee7b7', text: '#047857' },
      statB: { bg: '#ccfbf1', border: '#5eead4', text: '#0f766e' },
    },
    {
      accent: '#7c3aed',
      cardBg: resolvedTheme === 'dark' ? '#2e1065' : '#f5f3ff',
      border: '#a78bfa',
      badgeBg: '#ede9fe',
      badgeText: '#6d28d9',
      amountBg: '#ede9fe',
      amountText: '#5b21b6',
      statA: { bg: '#ede9fe', border: '#c4b5fd', text: '#6d28d9' },
      statB: { bg: '#f3e8ff', border: '#d8b4fe', text: '#7e22ce' },
    },
  ];

  return palettes[(rank - 1) % palettes.length];
}

function SalesPersonCard({
  person,
  rank,
  resolvedTheme,
}: {
  person: KpiSalesPersonSummary;
  rank: number;
  resolvedTheme: 'light' | 'dark';
}) {
  const theme = getSalesPersonCardTheme(rank, resolvedTheme);
  const initials = person.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        summaryTabStyles.personCard,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
        },
        kpiCardShadow(resolvedTheme),
      ]}
    >
      <View style={[summaryTabStyles.personAccentBar, { backgroundColor: theme.accent }]} />

      <View style={summaryTabStyles.personCardInner}>
        <View style={summaryTabStyles.personTopRow}>
          <View
            style={[
              summaryTabStyles.personAvatar,
              {
                backgroundColor: theme.badgeBg,
                borderWidth: 1.5,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[summaryTabStyles.rankText, { color: theme.badgeText, fontSize: 13 }]}>
              {initials || '#'}
            </Text>
          </View>

          <View style={summaryTabStyles.personBody}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[summaryTabStyles.personName, { color: theme.amountText }]}>
                {person.fullName}
              </Text>
              <View
                style={[
                  summaryTabStyles.rankBadge,
                  {
                    width: 'auto',
                    height: 'auto',
                    minWidth: 32,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    backgroundColor: theme.badgeBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[summaryTabStyles.rankText, { color: theme.badgeText, fontSize: 11 }]}>
                  #{rank}
                </Text>
              </View>
            </View>
            <Text style={[summaryTabStyles.personMeta, { color: theme.badgeText }]}>
              {person.salePersonId ? `ID ${person.salePersonId}` : 'No staff ID'}
              {person.position ? ` · ${person.position}` : ''}
            </Text>
          </View>

          <View
            style={[
              summaryTabStyles.personAmountPanel,
              {
                backgroundColor: theme.amountBg,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[summaryTabStyles.personAmountLabel, { color: theme.badgeText }]}>
              Total sales
            </Text>
            <Text style={[summaryTabStyles.personAmount, { color: theme.amountText }]}>
              {formatKpiAmount(person.totalSalesAmount)}
            </Text>
          </View>
        </View>

        <View style={summaryTabStyles.personStatsRow}>
          <View
            style={[
              summaryTabStyles.personStatPill,
              {
                backgroundColor: theme.statA.bg,
                borderColor: theme.statA.border,
              },
            ]}
          >
            <Text style={[summaryTabStyles.personStatLabel, { color: theme.statA.text }]}>
              Works done
            </Text>
            <Text style={[summaryTabStyles.personStatValue, { color: theme.statA.text }]}>
              {person.workCount}
            </Text>
          </View>
          <View
            style={[
              summaryTabStyles.personStatPill,
              {
                backgroundColor: theme.statB.bg,
                borderColor: theme.statB.border,
              },
            ]}
          >
            <Text style={[summaryTabStyles.personStatLabel, { color: theme.statB.text }]}>
              Avg. sale
            </Text>
            <Text style={[summaryTabStyles.personStatValue, { color: theme.statB.text }]}>
              {formatKpiAmount(
                person.workCount > 0 ? person.totalSalesAmount / person.workCount : 0,
              )}
            </Text>
          </View>
        </View>
      </View>
    </View>
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
  const accentUnassigned = resolvedTheme === 'dark' ? '#fbbf24' : '#d97706';

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

            <View
              style={[
                summaryTabStyles.teamSection,
                {
                  backgroundColor:
                    resolvedTheme === 'dark' ? '#0f172a' : `${paperTheme.colors.tertiary}08`,
                  borderColor: `${paperTheme.colors.tertiary}44`,
                },
                kpiCardShadow(resolvedTheme),
              ]}
            >
              <View style={summaryTabStyles.teamSectionHeader}>
                <View
                  style={[
                    summaryTabStyles.teamSectionIcon,
                    { backgroundColor: `${paperTheme.colors.tertiary}22` },
                  ]}
                >
                  <Ionicons name="people" size={22} color={paperTheme.colors.tertiary} />
                </View>
                <View style={summaryTabStyles.teamSectionTitleBlock}>
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
                    {salesPersons.length} member{salesPersons.length === 1 ? '' : 's'} ranked by
                    total sales
                  </Text>
                </View>
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
                    resolvedTheme={resolvedTheme}
                  />
                ))
              )}
            </View>

            {(unassignedSales?.count ?? 0) > 0 ? (
              <View
                style={[
                  summaryTabStyles.unassignedSection,
                  {
                    backgroundColor:
                      resolvedTheme === 'dark' ? '#1c1917' : `${accentUnassigned}08`,
                    borderColor: `${accentUnassigned}44`,
                  },
                  kpiCardShadow(resolvedTheme),
                ]}
              >
                <View style={summaryTabStyles.unassignedSectionHeader}>
                  <View
                    style={[
                      summaryTabStyles.unassignedSectionIcon,
                      { backgroundColor: `${accentUnassigned}22` },
                    ]}
                  >
                    <Ionicons name="help-buoy-outline" size={22} color={accentUnassigned} />
                  </View>
                  <View style={summaryTabStyles.teamSectionTitleBlock}>
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
                      {formatKpiAmount(unassignedSales?.totalSalesAmount ?? 0)} total
                    </Text>
                  </View>
                </View>

                {(unassignedSales?.orders ?? []).map((order) => (
                  <TouchableOpacity
                    key={`${order.orderId}-${order.checkOutTime}`}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('KpiUnassignedOrderDetail', {
                        orderId: order.orderId,
                      })
                    }
                    style={[
                      summaryTabStyles.unassignedOrderCard,
                      {
                        backgroundColor: resolvedTheme === 'dark' ? '#422006' : '#fffbeb',
                        borderColor: accentUnassigned,
                      },
                      kpiCardShadow(resolvedTheme),
                    ]}
                  >
                    <View style={summaryTabStyles.unassignedOrderTop}>
                      <View
                        style={[
                          summaryTabStyles.unassignedOrderIcon,
                          { backgroundColor: `${accentUnassigned}22` },
                        ]}
                      >
                        <Ionicons name="receipt-outline" size={20} color={accentUnassigned} />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          style={[
                            summaryTabStyles.unassignedOrderId,
                            { color: resolvedTheme === 'dark' ? '#fef3c7' : '#92400e' },
                          ]}
                        >
                          {order.orderId}
                        </Text>
                        <Text
                          style={[
                            summaryTabStyles.personMeta,
                            { color: resolvedTheme === 'dark' ? '#fcd34d' : '#b45309' },
                          ]}
                        >
                          {formatDisplayDate(order.checkOutTime.slice(0, 10))} · Tap to assign
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text
                          style={[
                            summaryTabStyles.unassignedOrderAmount,
                            { color: accentUnassigned },
                          ]}
                        >
                          {formatKpiAmount(order.totalAmount)}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={resolvedTheme === 'dark' ? '#fcd34d' : '#b45309'}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
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
