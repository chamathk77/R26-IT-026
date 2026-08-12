import React, { useCallback, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import CommonAlert from '../../../../../components/CommonAlert/CommonAlert';
import { useTheme } from '../../../../../context/ThemeContext';
import { useCommonAlert } from '../../../../../hooks/useCommonAlert';
import { fetchCostOverview_Service } from '../../../../../services/CostExpenseService';
import { AppDispatch, RootState } from '../../../../../store/store';
import { CostOverviewCategory } from '../../../../../type/costExpense';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../../utils/apiErrorAlert';
import CostDashboardQuickActions from '../../components/CostDashboardQuickActions';
import { CostDashboardWelcomeBanner } from '../../components/CostDashboardTopBar';
import { costCardShadow, costDashboardStyles as styles } from '../../shared/costDashboardStyles';
import { CostOverviewSkeleton } from '../../shared/costSkeletonComponents';
import { formatCostAmount } from '../../shared/costDashboardMockData';
import { dashboardTabShadow, dashboardTabStyles as tabStyles } from './dashboardTabStyles';

function formatOverviewMonth(monthStart?: string): string {
  if (!monthStart) {
    return new Date().toLocaleDateString('en-LK', { month: 'long', year: 'numeric' });
  }
  const parsed = new Date(monthStart);
  if (Number.isNaN(parsed.getTime())) return 'This month';
  return parsed.toLocaleDateString('en-LK', { month: 'long', year: 'numeric' });
}

function getCategoryColor(colorCode: string | undefined, fallback: string): string {
  const trimmed = colorCode?.trim();
  return trimmed ? trimmed : fallback;
}

function getSharePercent(categoryAmount: number, totalAmount: number): number {
  if (totalAmount <= 0) return 0;
  return Math.round((categoryAmount / totalAmount) * 100);
}

function OverviewStatChip({
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

function CategoryOverviewCard({
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
          of monthly spend
        </Text>
      </View>
    </View>
  );
}

export default function DashboardTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const { loading, data, error } = useSelector(
    (state: RootState) => state.CostExpenseReducer.overview,
  );

  const loadOverview = useCallback(async () => {
    try {
      await dispatch(fetchCostOverview_Service(undefined)).unwrap();
    } catch (err: unknown) {
      const handled = await handleSessionExpiredApiError(err, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(err, 'Could not load dashboard overview. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadOverview();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
    }, [loadOverview]),
  );

  const categories = data?.categories ?? [];
  const totalAmount = data?.totalAmount ?? 0;
  const categoryCount = data?.categoryCount ?? 0;
  const recordCount = data?.recordCount ?? 0;
  const monthLabel = useMemo(() => formatOverviewMonth(data?.monthStart), [data?.monthStart]);

  const showInitialLoading = loading && !data;

  return (
    <>
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && Boolean(data)}
            onRefresh={() => {
              void loadOverview();
            }}
            tintColor={paperTheme.colors.primary}
            colors={[paperTheme.colors.primary]}
          />
        }
      >
        <CostDashboardWelcomeBanner />
        <CostDashboardQuickActions />

        <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Current month overview
        </Text>

        {showInitialLoading ? (
          <CostOverviewSkeleton
            boneColor={paperTheme.colors.surfaceVariant}
            cardColor={paperTheme.colors.surface}
            borderColor={paperTheme.colors.outlineVariant}
          />
        ) : (
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
                  { backgroundColor: paperTheme.colors.secondary },
                ]}
              />

              <Text style={[tabStyles.heroEyebrow, { color: paperTheme.colors.primary }]}>
                Cost dashboard
              </Text>

              <View style={tabStyles.heroTitleRow}>
                <View style={tabStyles.heroTitleBlock}>
                  <Text style={[tabStyles.heroMonth, { color: paperTheme.colors.onSurface }]}>
                    {monthLabel}
                  </Text>
                  <Text style={[tabStyles.heroSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                    {recordCount} expense record{recordCount === 1 ? '' : 's'} across{' '}
                    {categoryCount} categor{categoryCount === 1 ? 'y' : 'ies'}
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
                  <Ionicons name="pie-chart-outline" size={24} color={paperTheme.colors.primary} />
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
                  Total spend
                </Text>
                <Text style={[tabStyles.heroAmountValue, { color: paperTheme.colors.error }]}>
                  {formatCostAmount(totalAmount)}
                </Text>
              </View>
            </View>

            <View style={tabStyles.statGrid}>
              <OverviewStatChip
                icon="folder-outline"
                label="Categories"
                value={String(categoryCount)}
                tint={paperTheme.colors.primary}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
              />
              <OverviewStatChip
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
                    {categories.length} active
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
                    name="analytics-outline"
                    size={30}
                    color={paperTheme.colors.onSurfaceVariant}
                  />
                </View>
                <Text style={[tabStyles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
                  No expenses this month
                </Text>
                <Text style={[tabStyles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {error
                    ? error
                    : 'Add your first expense to see category breakdown and monthly totals here.'}
                </Text>
              </View>
            ) : (
              categories.map((category) => (
                <CategoryOverviewCard
                  key={category.categoryId}
                  category={category}
                  totalAmount={totalAmount}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />
              ))
            )}
          </>
        )}
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
