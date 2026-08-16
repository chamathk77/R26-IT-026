import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../components/CommonAlert/CommonAlert';
import DatePickerField, {
  formatDisplayDate,
} from '../../components/DatePickerField/DatePickerField';
import SlideToast from '../../components/SlideToast/SlideToast';
import { useTheme } from '../../context/ThemeContext';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fetchAnalyticsOverview_Service } from '../../services/AnalyticsService';
import { resetAnalyticsOverview } from '../../store/reducers/AnalyticsReducer';
import { AppDispatch, RootState } from '../../store/store';
import { AnalyticsPeriodKey } from '../../type/analytics';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../utils/apiErrorAlert';
import { cardShadow } from '../settings/shared/settingsDetailStyles';
import {
  ANALYTICS_PERIOD_OPTIONS,
  getAnalyticsPeriodLabel,
} from './analyticsPeriodOptions';
import { AnalyticsOverviewSkeleton } from './analyticsSkeletonComponents';
import { analyticsStyles as styles } from './analyticsStyles';
import ForecastSection from './novelty01Forecasting/ForecastSection';

type Props = NativeStackScreenProps<RootStackParamList, 'Analytics'>;

function formatAnalyticsAmount(value: number): string {
  return `Rs. ${value.toLocaleString('en-LK')}`;
}

function formatMargin(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatRangeLabel(rangeStart?: string, rangeEnd?: string): string {
  if (!rangeStart || !rangeEnd) return '';
  return `${formatDisplayDate(rangeStart.slice(0, 10))} – ${formatDisplayDate(rangeEnd.slice(0, 10))}`;
}

function MetricCard({
  icon,
  label,
  amount,
  subLabel,
  tint,
  paperTheme,
  resolvedTheme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  amount: string;
  subLabel: string;
  tint: string;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      <View style={[styles.metricIconWrap, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[styles.metricLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: paperTheme.colors.onSurface }]}>{amount}</Text>
      <Text style={[styles.metricSub, { color: paperTheme.colors.onSurfaceVariant }]}>
        {subLabel}
      </Text>
    </View>
  );
}

export default function AnalyticsScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const { loading, data, error } = useSelector((state: RootState) => state.AnalyticsReducer.overview);

  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriodKey>('this_month');
  const [customRangeEnabled, setCustomRangeEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [slideToastMessage, setSlideToastMessage] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const todayMaximumDate = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  }, []);

  const startMaximumDate = useMemo(() => {
    if (!endDate.trim()) return todayMaximumDate;
    const end = new Date(`${endDate}T23:59:59`);
    return end.getTime() < todayMaximumDate.getTime() ? end : todayMaximumDate;
  }, [endDate, todayMaximumDate]);

  const showSlideToast = useCallback((message: string) => {
    setSlideToastMessage(message);
  }, []);

  const hideSlideToast = useCallback(() => {
    setSlideToastMessage(null);
  }, []);

  const loadOverview = useCallback(
    async (params: { period: AnalyticsPeriodKey } | { startDate: string; endDate: string }) => {
      try {
        await dispatch(fetchAnalyticsOverview_Service(params)).unwrap();
        hasLoadedRef.current = true;
      } catch (err: unknown) {
        const handled = await handleSessionExpiredApiError(err, show_Alert);
        if (handled) return;

        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(err, 'Could not load analytics. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadOverview(params);
          },
          'Cancel',
          () => {},
        );
      }
    },
    [dispatch, show_Alert],
  );

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current && !customRangeEnabled) {
        void loadOverview({ period: selectedPeriod });
      }
    }, [customRangeEnabled, loadOverview, selectedPeriod]),
  );

  const handleSelectPeriod = (period: AnalyticsPeriodKey) => {
    setCustomRangeEnabled(false);
    setStartDate('');
    setEndDate('');
    setSelectedPeriod(period);
    dispatch(resetAnalyticsOverview());
    void loadOverview({ period });
  };

  const handleApplyCustomRange = () => {
    if (startDate.trim() && !endDate.trim()) {
      showSlideToast('Select end date before applying custom range');
      return;
    }

    if (!startDate.trim() || !endDate.trim()) {
      showSlideToast('Select start date and end date');
      return;
    }

    setCustomRangeEnabled(true);
    setSelectedPeriod('this_month');
    dispatch(resetAnalyticsOverview());
    void loadOverview({ startDate: startDate.trim(), endDate: endDate.trim() });
  };

  const profitPositive = (data?.profit.amount ?? 0) >= 0;
  const profitTint = profitPositive ? '#059669' : paperTheme.colors.error;
  const profitHeroBg =
    resolvedTheme === 'dark'
      ? profitPositive
        ? '#052e16'
        : '#450a0a'
      : profitPositive
        ? '#ecfdf5'
        : '#fef2f2';

  const rangeLabel = useMemo(() => {
    if (data?.rangeStart && data?.rangeEnd) {
      return formatRangeLabel(data.rangeStart, data.rangeEnd);
    }
    if (customRangeEnabled && startDate && endDate) {
      return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
    }
    return getAnalyticsPeriodLabel(customRangeEnabled ? null : selectedPeriod);
  }, [customRangeEnabled, data?.rangeEnd, data?.rangeStart, endDate, selectedPeriod, startDate]);

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Analytics"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.filterCard,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              cardShadow(resolvedTheme),
            ]}
          >
            <Text style={[styles.filterTitle, { color: paperTheme.colors.onSurface }]}>
              Time period
            </Text>
            <View style={styles.periodRow}>
              {ANALYTICS_PERIOD_OPTIONS.map((option) => {
                const active = !customRangeEnabled && selectedPeriod === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    activeOpacity={0.85}
                    disabled={loading}
                    onPress={() => handleSelectPeriod(option.key)}
                    style={[
                      styles.periodChip,
                      {
                        backgroundColor: active
                          ? paperTheme.colors.primaryContainer
                          : paperTheme.colors.surfaceVariant,
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
                            ? paperTheme.colors.primary
                            : paperTheme.colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.customToggle}
              activeOpacity={0.8}
              onPress={() => setCustomRangeEnabled((current) => !current)}
            >
              <Text style={[styles.customToggleText, { color: paperTheme.colors.onSurface }]}>
                Custom date range
              </Text>
              <Ionicons
                name={customRangeEnabled ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={paperTheme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>

            {customRangeEnabled ? (
              <>
                <View style={styles.dateRow}>
                  <View style={{ flex: 1 }}>
                    <DatePickerField
                      label="Start"
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Start"
                      maximumDate={startMaximumDate}
                      paperTheme={paperTheme}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DatePickerField
                      label="End"
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="End"
                      minimumDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined}
                      maximumDate={todayMaximumDate}
                      paperTheme={paperTheme}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={loading}
                  onPress={handleApplyCustomRange}
                  style={[
                    styles.applyBtn,
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
                      <Ionicons name="calendar-outline" size={16} color={paperTheme.colors.onPrimary} />
                      <Text style={[styles.applyBtnText, { color: paperTheme.colors.onPrimary }]}>
                        Apply range
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            {rangeLabel ? (
              <Text style={[styles.rangeLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Showing: {rangeLabel}
              </Text>
            ) : null}
          </View>

          {loading && !data ? (
            <AnalyticsOverviewSkeleton
              boneColor={paperTheme.colors.surfaceVariant}
              cardColor={paperTheme.colors.surface}
              borderColor={paperTheme.colors.outlineVariant}
            />
          ) : null}

          {!loading && error && !data ? (
            <View
              style={[
                styles.emptyWrap,
                {
                  backgroundColor: paperTheme.colors.errorContainer,
                  borderColor: `${paperTheme.colors.error}33`,
                },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={28} color={paperTheme.colors.error} />
              <Text style={[styles.emptyTitle, { color: paperTheme.colors.onErrorContainer }]}>
                Could not load analytics
              </Text>
              <Text style={[styles.emptyText, { color: paperTheme.colors.onErrorContainer }]}>
                {error}
              </Text>
            </View>
          ) : null}

          {data ? (
            <>
              <View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: profitHeroBg,
                    borderColor: `${profitTint}44`,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <View style={[styles.heroAccent, { backgroundColor: profitTint }]} />
                <Text style={[styles.heroEyebrow, { color: profitTint }]}>Net profit</Text>
                <Text style={[styles.heroAmount, { color: profitTint }]}>
                  {formatAnalyticsAmount(data.profit.amount)}
                </Text>
                <View style={styles.heroMetaRow}>
                  <View style={[styles.heroBadge, { backgroundColor: `${profitTint}22` }]}>
                    <Text style={[styles.heroBadgeText, { color: profitTint }]}>
                      Margin {formatMargin(data.profit.margin)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.heroBadge,
                      { backgroundColor: paperTheme.colors.surfaceVariant },
                    ]}
                  >
                    <Text
                      style={[
                        styles.heroBadgeText,
                        { color: paperTheme.colors.onSurfaceVariant },
                      ]}
                    >
                      {rangeLabel}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <MetricCard
                  icon="trending-up-outline"
                  label="Total sales"
                  amount={formatAnalyticsAmount(data.sales.totalAmount)}
                  subLabel={`${data.sales.recordCount} record${data.sales.recordCount === 1 ? '' : 's'}`}
                  tint="#2563eb"
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />
                <MetricCard
                  icon="wallet-outline"
                  label="Total costs"
                  amount={formatAnalyticsAmount(data.costs.totalAmount)}
                  subLabel={`${data.costs.recordCount} record${data.costs.recordCount === 1 ? '' : 's'}`}
                  tint="#dc2626"
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />
              </View>

              <View
                style={[
                  styles.insightCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <Text style={[styles.insightTitle, { color: paperTheme.colors.onSurface }]}>
                  Period breakdown
                </Text>
                <View style={styles.insightRow}>
                  <Text style={[styles.insightLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Sales volume
                  </Text>
                  <Text style={[styles.insightValue, { color: paperTheme.colors.onSurface }]}>
                    {data.sales.recordCount} orders
                  </Text>
                </View>
                <View style={styles.insightRow}>
                  <Text style={[styles.insightLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Cost entries
                  </Text>
                  <Text style={[styles.insightValue, { color: paperTheme.colors.onSurface }]}>
                    {data.costs.recordCount} expenses
                  </Text>
                </View>
                <View style={styles.insightRow}>
                  <Text style={[styles.insightLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Avg. sale value
                  </Text>
                  <Text style={[styles.insightValue, { color: paperTheme.colors.onSurface }]}>
                    {data.sales.recordCount > 0
                      ? formatAnalyticsAmount(data.sales.totalAmount / data.sales.recordCount)
                      : '—'}
                  </Text>
                </View>
                <View style={styles.insightRow}>
                  <Text style={[styles.insightLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Avg. cost value
                  </Text>
                  <Text style={[styles.insightValue, { color: paperTheme.colors.onSurface }]}>
                    {data.costs.recordCount > 0
                      ? formatAnalyticsAmount(data.costs.totalAmount / data.costs.recordCount)
                      : '—'}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {!loading && !data && !error ? (
            <View
              style={[
                styles.emptyWrap,
                {
                  backgroundColor: paperTheme.colors.surfaceVariant,
                  borderColor: paperTheme.colors.outlineVariant,
                },
              ]}
            >
              <Ionicons name="analytics-outline" size={28} color={paperTheme.colors.onSurfaceVariant} />
              <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
                Select a period
              </Text>
              <Text style={[styles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
                Choose a preset period or apply a custom date range to view sales, costs, and profit.
              </Text>
            </View>
          ) : null}

          <ForecastSection />
        </ScrollView>
      </SafeAreaView>

      <SlideToast message={slideToastMessage} onDismiss={hideSlideToast} paperTheme={paperTheme} />

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
          />
        </Portal>
      ) : null}
    </>
  );
}
