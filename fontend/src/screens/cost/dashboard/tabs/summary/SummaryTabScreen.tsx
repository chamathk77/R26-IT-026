import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import CommonAlert from '../../../../../components/CommonAlert/CommonAlert';
import DatePickerField, { formatDisplayDate } from '../../../../../components/DatePickerField/DatePickerField';
import { useTheme } from '../../../../../context/ThemeContext';
import { useCommonAlert } from '../../../../../hooks/useCommonAlert';
import { fetchCostSummary_Service } from '../../../../../services/CostExpenseService';
import { AppDispatch, RootState } from '../../../../../store/store';
import { CostOverviewCategory, CostSummaryPeriod } from '../../../../../type/costExpense';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../../utils/apiErrorAlert';
import {
  dashboardTabShadow,
  dashboardTabStyles as tabStyles,
} from '../dashboard/dashboardTabStyles';
import {
  costCardShadow,
  costDashboardStyles as styles,
} from '../../shared/costDashboardStyles';
import {
  CostPeriodKey,
  formatCostAmount,
  getSummaryPeriodLabel,
  SUMMARY_PERIOD_OPTIONS,
} from '../../shared/costDashboardMockData';
import { summaryTabStyles } from './summaryTabStyles';

function getCategoryColor(colorCode: string | undefined, fallback: string): string {
  const trimmed = colorCode?.trim();
  return trimmed ? trimmed : fallback;
}

function getSharePercent(categoryAmount: number, totalAmount: number): number {
  if (totalAmount <= 0) return 0;
  return Math.round((categoryAmount / totalAmount) * 100);
}

function buildSummarySubtitle(
  isCustomRange: boolean,
  startDate: string,
  endDate: string,
  selectedPeriod: CostPeriodKey | null,
): string {
  if (isCustomRange) {
    return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
  }
  return getSummaryPeriodLabel(selectedPeriod ?? 'current_month');
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
        tabStyles.statChip,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        dashboardTabShadow(resolvedTheme),
      ]}
    >
      <View style={[tabStyles.statIconWrap, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[tabStyles.statChipLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text style={[tabStyles.statChipValue, { color: paperTheme.colors.onSurface }]}>{value}</Text>
    </View>
  );
}

function SummaryCategoryCard({
  category,
  totalAmount,
  paperTheme,
  resolvedTheme,
}: {
  category: CostOverviewCategory;
  totalAmount: number;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  const accent = getCategoryColor(category.colorCode, paperTheme.colors.primary);
  const sharePercent = getSharePercent(category.totalAmount, totalAmount);

  return (
    <View
      style={[
        tabStyles.categoryCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: `${accent}33`,
        },
        dashboardTabShadow(resolvedTheme),
      ]}
    >
      <View style={tabStyles.categoryTopRow}>
        <View
          style={[
            tabStyles.categoryIcon,
            {
              backgroundColor: `${accent}14`,
              borderColor: `${accent}33`,
            },
          ]}
        >
          <Ionicons name="pricetag-outline" size={20} color={accent} />
        </View>

        <View style={tabStyles.categoryBody}>
          <Text
            style={[tabStyles.categoryName, { color: paperTheme.colors.onSurface }]}
            numberOfLines={1}
          >
            {category.categoryName}
          </Text>
          <Text style={[tabStyles.categoryMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
            {category.expenseCount} expense{category.expenseCount === 1 ? '' : 's'}
          </Text>
        </View>

        <Text style={[tabStyles.categoryAmount, { color: paperTheme.colors.onSurface }]}>
          {formatCostAmount(category.totalAmount)}
        </Text>
      </View>

      <View
        style={[tabStyles.progressTrack, { backgroundColor: paperTheme.colors.surfaceVariant }]}
      >
        <View
          style={[
            tabStyles.progressFill,
            {
              width: `${Math.max(sharePercent, 4)}%`,
              backgroundColor: accent,
            },
          ]}
        />
      </View>

      <View style={tabStyles.progressFooter}>
        <Text style={[tabStyles.progressPercent, { color: accent }]}>{sharePercent}%</Text>
        <Text style={[tabStyles.progressShare, { color: paperTheme.colors.onSurfaceVariant }]}>
          of selected period
        </Text>
      </View>
    </View>
  );
}

export default function SummaryTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const { loading, data, error } = useSelector(
    (state: RootState) => state.CostExpenseReducer.summary,
  );

  const [selectedPeriod, setSelectedPeriod] = useState<CostPeriodKey | null>('current_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isCustomRange = Boolean(startDate.trim() && endDate.trim());
  const hasPartialCustomRange = Boolean(
    (startDate.trim() && !endDate.trim()) || (!startDate.trim() && endDate.trim()),
  );
  const canFetchSummary = isCustomRange || !hasPartialCustomRange;

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

  const loadSummary = useCallback(async () => {
    if (!canFetchSummary) return;

    const params = isCustomRange
      ? { startDate: startDate.trim(), endDate: endDate.trim() }
      : { period: (selectedPeriod ?? 'current_month') as CostSummaryPeriod };

    try {
      await dispatch(fetchCostSummary_Service(params)).unwrap();
    } catch (err: unknown) {
      const handled = await handleSessionExpiredApiError(err, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(err, 'Could not load cost summary. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadSummary();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [
    canFetchSummary,
    dispatch,
    endDate,
    isCustomRange,
    selectedPeriod,
    show_Alert,
    startDate,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary]),
  );

  const subtitle = useMemo(
    () => buildSummarySubtitle(isCustomRange, startDate, endDate, selectedPeriod),
    [endDate, isCustomRange, selectedPeriod, startDate],
  );

  const categories = data?.categories ?? [];
  const totalAmount = data?.totalAmount ?? 0;
  const categoryCount = data?.categoryCount ?? 0;
  const recordCount = data?.recordCount ?? 0;
  const showInitialLoading = loading && !data && canFetchSummary;

  return (
    <>
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading && Boolean(data) && canFetchSummary}
            onRefresh={() => {
              void loadSummary();
            }}
            tintColor={paperTheme.colors.primary}
            colors={[paperTheme.colors.primary]}
          />
        }
      >
        <View
          style={[
            summaryTabStyles.filterCard,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: paperTheme.colors.outlineVariant,
            },
            costCardShadow(resolvedTheme),
          ]}
        >
          <Text style={[summaryTabStyles.filterCardTitle, { color: paperTheme.colors.onSurface }]}>
            Filter period
          </Text>
          <Text style={[summaryTabStyles.filterHint, { color: paperTheme.colors.onSurfaceVariant }]}>
            Choose a preset or pick a custom start and end date.
          </Text>

          <View style={styles.periodRow}>
            {SUMMARY_PERIOD_OPTIONS.map((option) => {
              const active = !isCustomRange && !hasPartialCustomRange && selectedPeriod === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => handleSelectPeriod(option.key)}
                  style={[
                    styles.periodChip,
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

          <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant, marginBottom: 0 }]}>
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
        </View>

        {hasPartialCustomRange ? (
          <View
            style={[
              summaryTabStyles.pendingRangeBanner,
              {
                backgroundColor: paperTheme.colors.secondaryContainer,
                borderColor: `${paperTheme.colors.secondary}33`,
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={20} color={paperTheme.colors.secondary} />
            <Text
              style={[summaryTabStyles.pendingRangeText, { color: paperTheme.colors.onSecondaryContainer }]}
            >
              Select both start and end dates to load a custom range summary.
            </Text>
          </View>
        ) : null}

        {showInitialLoading ? (
          <View style={tabStyles.loadingWrap}>
            <ActivityIndicator color={paperTheme.colors.primary} size="large" />
            <Text style={[tabStyles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading summary...
            </Text>
          </View>
        ) : canFetchSummary ? (
          <>
            <View
              style={[
                tabStyles.overviewHero,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: `${paperTheme.colors.primary}33`,
                },
                dashboardTabShadow(resolvedTheme),
              ]}
            >
              <View
                style={[tabStyles.heroAccent, { backgroundColor: paperTheme.colors.primary }]}
              />
              <View
                style={[
                  tabStyles.heroAccentSecondary,
                  { backgroundColor: paperTheme.colors.tertiary },
                ]}
              />

              <Text style={[tabStyles.heroEyebrow, { color: paperTheme.colors.primary }]}>
                Cost summary
              </Text>

              <View style={tabStyles.heroTitleRow}>
                <View style={tabStyles.heroTitleBlock}>
                  <Text style={[tabStyles.heroMonth, { color: paperTheme.colors.onSurface }]}>
                    {subtitle}
                  </Text>
                  <Text style={[tabStyles.heroSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                    {recordCount} expense record{recordCount === 1 ? '' : 's'} · {categoryCount}{' '}
                    categor{categoryCount === 1 ? 'y' : 'ies'}
                  </Text>
                </View>

                <View
                  style={[
                    tabStyles.heroIconWrap,
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
                  tabStyles.heroAmountPanel,
                  {
                    backgroundColor: `${paperTheme.colors.error}10`,
                    borderColor: `${paperTheme.colors.error}22`,
                  },
                ]}
              >
                <Text
                  style={[tabStyles.heroAmountLabel, { color: paperTheme.colors.onSurfaceVariant }]}
                >
                  Total cost
                </Text>
                <Text style={[tabStyles.heroAmountValue, { color: paperTheme.colors.error }]}>
                  {formatCostAmount(totalAmount)}
                </Text>
              </View>
            </View>

            <View style={tabStyles.statGrid}>
              <SummaryStatChip
                icon="folder-outline"
                label="Categories"
                value={String(categoryCount)}
                tint={paperTheme.colors.primary}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
              />
              <SummaryStatChip
                icon="receipt-outline"
                label="Records"
                value={String(recordCount)}
                tint={paperTheme.colors.secondary}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
              />
            </View>

            <View style={tabStyles.categorySectionHeader}>
              <Text
                style={[tabStyles.categorySectionTitle, { color: paperTheme.colors.onSurfaceVariant }]}
              >
                By category
              </Text>
              {categories.length > 0 ? (
                <View
                  style={[
                    tabStyles.categorySectionBadge,
                    { backgroundColor: paperTheme.colors.primaryContainer },
                  ]}
                >
                  <Text
                    style={[
                      tabStyles.categorySectionBadgeText,
                      { color: paperTheme.colors.onPrimaryContainer },
                    ]}
                  >
                    {categories.length} listed
                  </Text>
                </View>
              ) : null}
            </View>

            {categories.length === 0 ? (
              <View
                style={[
                  tabStyles.emptyWrap,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  costCardShadow(resolvedTheme),
                ]}
              >
                <View
                  style={[
                    tabStyles.emptyIcon,
                    { backgroundColor: paperTheme.colors.surfaceVariant },
                  ]}
                >
                  <Ionicons
                    name="folder-open-outline"
                    size={30}
                    color={paperTheme.colors.onSurfaceVariant}
                  />
                </View>
                <Text style={[tabStyles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
                  No expenses found
                </Text>
                <Text style={[tabStyles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {error || 'Try a different period or date range.'}
                </Text>
              </View>
            ) : (
              categories.map((category) => (
                <SummaryCategoryCard
                  key={category.categoryId}
                  category={category}
                  totalAmount={totalAmount}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />
              ))
            )}
          </>
        ) : null}
      </ScrollView>

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
          />
        </Portal>
      ) : null}
    </>
  );
}
