import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../../context/ThemeContext';
import { getApiErrorMessage } from '../../../utils/apiErrorAlert';
import { cardShadow } from '../../settings/shared/settingsDetailStyles';
import { fetchSalesCostForecast } from './forecastService';
import { forecastStyles as styles } from './forecastStyles';
import type {
  ForecastHorizon,
  ForecastHorizonKey,
  SalesCostForecastData,
} from './forecastTypes';

const HISTORY_MONTHS_ON_CHART = 6;
const FORECAST_MONTHS_ON_CHART = 6;

const SALES_TINT = '#2563eb';
const COST_TINT = '#dc2626';
const FORECAST_TINT = '#f59e0b';

function formatCurrency(value: number): string {
  return `Rs. ${Math.round(value).toLocaleString('en-LK')}`;
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000)}K`;
  }
  return String(Math.round(value));
}

function describeMethod(method: string): string {
  if (method.startsWith('holt_winters')) return 'Holt-Winters (seasonal, damped trend)';
  if (method.startsWith('holt_linear')) return 'Holt linear trend (damped)';
  if (method === 'linear_regression') return 'Linear regression';
  if (method === 'moving_average') return 'Moving average';
  return method;
}

export default function ForecastSection() {
  const { paperTheme, resolvedTheme } = useTheme();

  const [data, setData] = useState<SalesCostForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horizonKey, setHorizonKey] = useState<ForecastHorizonKey>('next_3_months');

  const loadForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSalesCostForecast();
      setData(result);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not load the forecast. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadForecast();
  }, [loadForecast]);

  const horizons = data?.forecast.horizons ?? [];
  const selectedHorizon: ForecastHorizon | null =
    horizons.find((item) => item.key === horizonKey) ?? horizons[0] ?? null;

  const chart = useMemo(() => {
    if (!data) return null;

    const completeHistory = data.history.months.filter((month) => !month.partial);
    const historySlice = completeHistory.slice(-HISTORY_MONTHS_ON_CHART);
    const forecastSlice = data.forecast.months.slice(0, FORECAST_MONTHS_ON_CHART);

    if (historySlice.length + forecastSlice.length < 2) return null;

    const labels = [
      ...historySlice.map((month) => month.label.split(' ')[0]),
      ...forecastSlice.map((month) => month.label.split(' ')[0]),
    ];

    return {
      splitIndex: historySlice.length,
      labels: labels.map((label, index) => (index % 2 === 0 ? label : '')),
      sales: [
        ...historySlice.map((month) => month.sales),
        ...forecastSlice.map((month) => month.sales.predicted),
      ],
      costs: [
        ...historySlice.map((month) => month.costs),
        ...forecastSlice.map((month) => month.costs.predicted),
      ],
    };
  }, [data]);

  const horizonMonths = useMemo(() => {
    if (!data || !selectedHorizon) return [];
    return data.forecast.months.slice(0, selectedHorizon.monthCount);
  }, [data, selectedHorizon]);

  const surface = paperTheme.colors.surface;
  const outline = paperTheme.colors.outlineVariant;
  const onSurface = paperTheme.colors.onSurface;
  const onSurfaceVariant = paperTheme.colors.onSurfaceVariant;

  const renderHeader = () => (
    <>
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionIconWrap,
            { backgroundColor: paperTheme.colors.primaryContainer },
          ]}
        >
          <Ionicons name="trending-up" size={19} color={paperTheme.colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: onSurface }]}>
          Sales &amp; cost forecast
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { color: onSurfaceVariant }]}>
        Predicted sales, costs and profit for the months ahead, learned from your
        recorded sales history and expenses.
      </Text>
    </>
  );

  if (loading) {
    return (
      <>
        {renderHeader()}
        <View
          style={[
            styles.card,
            { backgroundColor: surface, borderColor: outline },
            cardShadow(resolvedTheme),
          ]}
        >
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text style={[styles.loadingText, { color: onSurfaceVariant }]}>
              Analysing your sales history…
            </Text>
          </View>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        {renderHeader()}
        <View
          style={[
            styles.card,
            {
              backgroundColor: paperTheme.colors.errorContainer,
              borderColor: `${paperTheme.colors.error}33`,
            },
          ]}
        >
          <View style={styles.predictionLabelRow}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={paperTheme.colors.error}
            />
            <Text
              style={[styles.predictionLabel, { color: paperTheme.colors.onErrorContainer }]}
            >
              Forecast unavailable
            </Text>
          </View>
          <Text style={[styles.noticeText, { color: paperTheme.colors.onErrorContainer }]}>
            {error}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => void loadForecast()}
            style={[styles.retryBtn, { backgroundColor: paperTheme.colors.error }]}
          >
            <Ionicons name="refresh" size={15} color={paperTheme.colors.onError} />
            <Text style={[styles.retryBtnText, { color: paperTheme.colors.onError }]}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (!data) return null;

  if (!selectedHorizon) {
    return (
      <>
        {renderHeader()}
        <View
          style={[
            styles.noticeCard,
            {
              backgroundColor: paperTheme.colors.surfaceVariant,
              borderColor: outline,
            },
          ]}
        >
          <Ionicons name="hourglass-outline" size={18} color={onSurfaceVariant} />
          <Text style={[styles.noticeText, { color: onSurfaceVariant }]}>
            {data.dataQuality.message}
          </Text>
        </View>
      </>
    );
  }

  const profitPositive = selectedHorizon.profit.predicted >= 0;
  const profitTint = profitPositive ? '#059669' : paperTheme.colors.error;

  return (
    <>
      {renderHeader()}

      {data.dataQuality.level !== 'good' ? (
        <View
          style={[
            styles.noticeCard,
            { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
          ]}
        >
          <Ionicons name="information-circle-outline" size={18} color="#b45309" />
          <Text style={[styles.noticeText, { color: '#92400e' }]}>
            {data.dataQuality.message}
          </Text>
        </View>
      ) : null}

      <View style={styles.horizonRow}>
        {horizons.map((horizon) => {
          const active = horizon.key === selectedHorizon.key;
          return (
            <TouchableOpacity
              key={horizon.key}
              activeOpacity={0.85}
              onPress={() => setHorizonKey(horizon.key)}
              style={[
                styles.horizonChip,
                {
                  backgroundColor: active
                    ? paperTheme.colors.primaryContainer
                    : surface,
                  borderColor: active ? paperTheme.colors.primary : outline,
                },
              ]}
            >
              <Text
                style={[
                  styles.horizonChipText,
                  { color: active ? paperTheme.colors.primary : onSurfaceVariant },
                ]}
              >
                {horizon.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.rangeCaption, { color: onSurfaceVariant }]}>
        {selectedHorizon.startLabel === selectedHorizon.endLabel
          ? selectedHorizon.startLabel
          : `${selectedHorizon.startLabel} – ${selectedHorizon.endLabel}`}
        {' · '}
        {selectedHorizon.monthCount} month{selectedHorizon.monthCount === 1 ? '' : 's'}
      </Text>

      <View style={styles.predictionGrid}>
        <View
          style={[
            styles.predictionCard,
            { backgroundColor: surface, borderColor: outline },
            cardShadow(resolvedTheme),
          ]}
        >
          <View style={styles.predictionLabelRow}>
            <Ionicons name="trending-up-outline" size={15} color={SALES_TINT} />
            <Text style={[styles.predictionLabel, { color: SALES_TINT }]}>Sales</Text>
          </View>
          <Text style={[styles.predictionValue, { color: onSurface }]}>
            {formatCurrency(selectedHorizon.sales.predicted)}
          </Text>
          <Text style={[styles.predictionRange, { color: onSurfaceVariant }]}>
            Range {formatCompact(selectedHorizon.sales.lower)} –{' '}
            {formatCompact(selectedHorizon.sales.upper)}
          </Text>
        </View>

        <View
          style={[
            styles.predictionCard,
            { backgroundColor: surface, borderColor: outline },
            cardShadow(resolvedTheme),
          ]}
        >
          <View style={styles.predictionLabelRow}>
            <Ionicons name="wallet-outline" size={15} color={COST_TINT} />
            <Text style={[styles.predictionLabel, { color: COST_TINT }]}>Costs</Text>
          </View>
          <Text style={[styles.predictionValue, { color: onSurface }]}>
            {formatCurrency(selectedHorizon.costs.predicted)}
          </Text>
          <Text style={[styles.predictionRange, { color: onSurfaceVariant }]}>
            Range {formatCompact(selectedHorizon.costs.lower)} –{' '}
            {formatCompact(selectedHorizon.costs.upper)}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.profitCard,
          {
            backgroundColor:
              resolvedTheme === 'dark'
                ? profitPositive
                  ? '#052e16'
                  : '#450a0a'
                : profitPositive
                  ? '#ecfdf5'
                  : '#fef2f2',
            borderColor: `${profitTint}44`,
          },
          cardShadow(resolvedTheme),
        ]}
      >
        <Text style={[styles.profitLabel, { color: profitTint }]}>
          Predicted profit
        </Text>
        <Text style={[styles.profitValue, { color: profitTint }]}>
          {formatCurrency(selectedHorizon.profit.predicted)}
        </Text>
        <View style={styles.profitMetaRow}>
          <View style={[styles.profitBadge, { backgroundColor: `${profitTint}22` }]}>
            <Text style={[styles.profitBadgeText, { color: profitTint }]}>
              Margin {selectedHorizon.profit.margin.toFixed(1)}%
            </Text>
          </View>
          <View
            style={[
              styles.profitBadge,
              { backgroundColor: paperTheme.colors.surfaceVariant },
            ]}
          >
            <Text style={[styles.profitBadgeText, { color: onSurfaceVariant }]}>
              ≈ {formatCurrency(selectedHorizon.monthlyAverage.profit)} / month
            </Text>
          </View>
        </View>
      </View>

      {data.currentMonth ? (
        <View
          style={[
            styles.card,
            { backgroundColor: surface, borderColor: outline },
            cardShadow(resolvedTheme),
          ]}
        >
          <Text style={[styles.chartTitle, { color: onSurface }]}>
            {data.currentMonth.label} in progress
          </Text>
          <Text style={[styles.chartCaption, { color: onSurfaceVariant }]}>
            How this month is tracking against its projected total.
          </Text>
          <View style={styles.accuracyRow}>
            <Text style={[styles.accuracyLabel, { color: onSurfaceVariant }]}>
              Sales so far
            </Text>
            <Text style={[styles.accuracyValue, { color: onSurface }]}>
              {formatCurrency(data.currentMonth.actualSoFar.sales)} of{' '}
              {formatCurrency(data.currentMonth.projectedTotal.sales)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: outline }]} />
          <View style={styles.accuracyRow}>
            <Text style={[styles.accuracyLabel, { color: onSurfaceVariant }]}>
              Costs so far
            </Text>
            <Text style={[styles.accuracyValue, { color: onSurface }]}>
              {formatCurrency(data.currentMonth.actualSoFar.costs)} of{' '}
              {formatCurrency(data.currentMonth.projectedTotal.costs)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: outline }]} />
          <View style={styles.accuracyRow}>
            <Text style={[styles.accuracyLabel, { color: onSurfaceVariant }]}>
              Projected profit
            </Text>
            <Text style={[styles.accuracyValue, { color: profitTint }]}>
              {formatCurrency(data.currentMonth.projectedTotal.profit)}
            </Text>
          </View>
        </View>
      ) : null}

      {chart ? (
        <View
          style={[
            styles.card,
            { backgroundColor: surface, borderColor: outline },
            cardShadow(resolvedTheme),
          ]}
        >
          <Text style={[styles.chartTitle, { color: onSurface }]}>
            History vs forecast
          </Text>
          <Text style={[styles.chartCaption, { color: onSurfaceVariant }]}>
            Last {chart.splitIndex} recorded months followed by the next{' '}
            {chart.sales.length - chart.splitIndex} predicted months.
          </Text>
          <LineChart
            data={{
              labels: chart.labels,
              datasets: [
                {
                  data: chart.sales,
                  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                  strokeWidth: 2,
                },
                {
                  data: chart.costs,
                  color: (opacity = 1) => `rgba(220, 38, 38, ${opacity})`,
                  strokeWidth: 2,
                },
              ],
            }}
            width={Dimensions.get('window').width - 72}
            height={210}
            withShadow={false}
            withInnerLines={false}
            fromZero={false}
            bezier
            formatYLabel={(value) => formatCompact(Number(value))}
            getDotColor={(_point, index) =>
              index >= chart.splitIndex ? FORECAST_TINT : SALES_TINT
            }
            chartConfig={{
              backgroundGradientFrom: surface,
              backgroundGradientTo: surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
              labelColor: () => onSurfaceVariant,
              propsForDots: { r: '3.5' },
              propsForBackgroundLines: { stroke: outline },
            }}
            style={styles.chart}
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SALES_TINT }]} />
              <Text style={[styles.legendText, { color: onSurfaceVariant }]}>Sales</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COST_TINT }]} />
              <Text style={[styles.legendText, { color: onSurfaceVariant }]}>Costs</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: FORECAST_TINT }]} />
              <Text style={[styles.legendText, { color: onSurfaceVariant }]}>
                Predicted points
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.card,
          { backgroundColor: surface, borderColor: outline },
          cardShadow(resolvedTheme),
        ]}
      >
        <Text style={[styles.chartTitle, { color: onSurface }]}>
          Month by month
        </Text>
        <Text style={[styles.chartCaption, { color: onSurfaceVariant }]}>
          Predicted totals for each month in this horizon.
        </Text>
        {horizonMonths.map((month, index) => (
          <React.Fragment key={month.month}>
            <View style={styles.monthRow}>
              <Text style={[styles.monthLabel, { color: onSurface }]}>
                {month.label}
              </Text>
              <View style={styles.monthValues}>
                <Text style={[styles.monthPrimary, { color: SALES_TINT }]}>
                  {formatCurrency(month.sales.predicted)}
                </Text>
                <Text style={[styles.monthSecondary, { color: onSurfaceVariant }]}>
                  costs {formatCurrency(month.costs.predicted)}
                </Text>
              </View>
              <Text
                style={[
                  styles.monthProfit,
                  { color: month.profit.predicted >= 0 ? '#059669' : paperTheme.colors.error },
                ]}
              >
                {formatCompact(month.profit.predicted)}
              </Text>
            </View>
            {index < horizonMonths.length - 1 ? (
              <View style={[styles.divider, { backgroundColor: outline }]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      {data.models ? (
        <View
          style={[
            styles.card,
            { backgroundColor: surface, borderColor: outline },
            cardShadow(resolvedTheme),
          ]}
        >
          <Text style={[styles.chartTitle, { color: onSurface }]}>Model accuracy</Text>
          <Text style={[styles.chartCaption, { color: onSurfaceVariant }]}>
            Measured by re-running the model on past months it had not seen. Lower
            error means more reliable predictions.
          </Text>

          <View style={styles.engineBadgeRow}>
            <View style={[styles.engineBadge, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="logo-python" size={13} color="#15803d" />
              <Text style={[styles.engineBadgeText, { color: '#15803d' }]}>
                Python · statsmodels
              </Text>
            </View>
          </View>

          <View style={styles.accuracyRow}>
            <Text style={[styles.accuracyLabel, { color: onSurfaceVariant }]}>
              Sales error (MAPE)
            </Text>
            <Text style={[styles.accuracyValue, { color: onSurface }]}>
              {data.models.sales.backtest?.mape != null
                ? `${data.models.sales.backtest.mape}%`
                : '—'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: outline }]} />
          <View style={styles.accuracyRow}>
            <Text style={[styles.accuracyLabel, { color: onSurfaceVariant }]}>
              Cost error (MAPE)
            </Text>
            <Text style={[styles.accuracyValue, { color: onSurface }]}>
              {data.models.costs.backtest?.mape != null
                ? `${data.models.costs.backtest.mape}%`
                : '—'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: outline }]} />
          <View style={styles.accuracyRow}>
            <Text style={[styles.accuracyLabel, { color: onSurfaceVariant }]}>
              History used
            </Text>
            <Text style={[styles.accuracyValue, { color: onSurface }]}>
              {data.dataQuality.monthsOfHistory} months
            </Text>
          </View>

          <View
            style={[
              styles.methodPill,
              { backgroundColor: paperTheme.colors.primaryContainer },
            ]}
          >
            <Text style={[styles.methodPillText, { color: paperTheme.colors.primary }]}>
              {describeMethod(data.models.sales.method)}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );
}
