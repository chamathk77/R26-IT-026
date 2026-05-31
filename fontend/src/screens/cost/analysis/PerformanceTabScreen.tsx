import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { CostAnalysisTabParamList } from '../../../navigation/CostAnalysisTabParamList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { fetchNextMonthForecast_Service, fetchMonthlySeries_Service } from '../../../services/ForecastService';
import { NextMonthForecast, ForecastStatus, MonthlySeriesPoint } from '../../../type/forecast';

type PerfProps = BottomTabScreenProps<CostAnalysisTabParamList, 'Performance'>;

function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDeltaMoney(last: number, next: number): string {
  const d = next - last;
  const pctStr = last !== 0 ? ` (${d >= 0 ? '+' : ''}${((d / last) * 100).toFixed(1)}%)` : '';
  return `${formatMoney(d)}${pctStr}`;
}

function formatDeltaMargin(lastPct: number, nextPct: number): string {
  const d = nextPct - lastPct;
  const sign = d >= 0 ? '+' : '';
  return `${sign}${d.toFixed(2)} pts`;
}

function formatCsvMonthHeading(ym: string): string {
  const parts = ym.split('-');
  const y = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '1', 10);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** Same definition as forecast: (sales − cost) / sales × 100. */
function marginPercentFromSalesCost(sales: number, cost: number): number | null {
  if (sales === 0 || Number.isNaN(sales) || Number.isNaN(cost)) return null;
  return ((sales - cost) / sales) * 100;
}

function statusColors(
  status: ForecastStatus,
  paperTheme: ReturnType<typeof useTheme>['paperTheme'],
): { fg: string; bg: string; border: string } {
  const t = paperTheme.colors as typeof paperTheme.colors & {
    success?: string;
    successContainer?: string;
  };
  switch (status) {
    case 'GREEN':
      return {
        fg: t.success ?? '#15803D',
        bg: t.successContainer ?? '#DCFCE7',
        border: t.success ?? '#15803D',
      };
    case 'YELLOW':
      return { fg: '#a16207', bg: '#fef9c3', border: '#ca8a04' };
    case 'RED':
    default:
      return {
        fg: paperTheme.colors.error,
        bg: paperTheme.colors.errorContainer,
        border: paperTheme.colors.error,
      };
  }
}

function ForecastMarginStatusRow({
  forecast,
  statusStyle,
  onSurface,
}: {
  forecast: NextMonthForecast;
  statusStyle: { fg: string; bg: string; border: string };
  onSurface: string;
}) {
  return (
    <View
      style={[
        styles.statusRow,
        { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
      ]}
    >
      <View style={[styles.statusDot, { backgroundColor: statusStyle.fg }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.statusLabel, { color: statusStyle.fg }]}>Forecast margin signal</Text>
        <Text style={[styles.statusValue, { color: onSurface }]}>{forecast.status}</Text>
      </View>
      <Text style={[styles.marginPct, { color: statusStyle.fg }]}>{forecast.marginPercent}%</Text>
    </View>
  );
}

export function PerformanceTabScreen(_props: PerfProps) {
  const { paperTheme } = useTheme();
  const [forecast, setForecast] = useState<NextMonthForecast | null>(null);
  const [csvLastMonth, setCsvLastMonth] = useState<MonthlySeriesPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [fr, sr] = await Promise.allSettled([
        fetchNextMonthForecast_Service(),
        fetchMonthlySeries_Service(1),
      ]);

      if (fr.status === 'fulfilled') {
        setForecast(fr.value);
      } else {
        setForecast(null);
        const reason = fr.reason;
        const msg =
          reason instanceof Error
            ? reason.message
            : reason && typeof reason === 'object' && 'message' in reason && typeof (reason as { message: unknown }).message === 'string'
              ? (reason as { message: string }).message
              : 'Could not load forecast.';
        setError(msg);
      }

      if (sr.status === 'fulfilled' && sr.value.length > 0) {
        setCsvLastMonth(sr.value[sr.value.length - 1]);
      } else {
        setCsvLastMonth(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const statusStyle = forecast ? statusColors(forecast.status, paperTheme) : null;

  const csvMarginPct = csvLastMonth ? marginPercentFromSalesCost(csvLastMonth.sales, csvLastMonth.cost) : null;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: paperTheme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={paperTheme.colors.primary} />
      }
    >
      <Text style={[styles.heading, { color: paperTheme.colors.onBackground }]}>Performance</Text>
      <Text style={[styles.body, { color: paperTheme.colors.onSurfaceVariant }]}>
        Next-month sales & cost forecast (via Node API → Python Analysis service). Latest actuals come from
        monthly_performance.csv.
      </Text>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={paperTheme.colors.primary} />
        </View>
      ) : null}

      {!loading && csvLastMonth ? (
        <View style={[styles.lastCsvCard, { backgroundColor: paperTheme.colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Latest month · CSV</Text>
          <Text style={[styles.lastCsvMonthLine, { color: paperTheme.colors.onBackground }]}>
            {formatCsvMonthHeading(csvLastMonth.month)}
            <Text style={[styles.lastCsvYm, { color: paperTheme.colors.onSurfaceVariant }]}> ({csvLastMonth.month})</Text>
          </Text>
          <View style={[styles.metricCell, styles.lastCsvMetric]}>
            <Text style={[styles.metricLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Sales</Text>
            <Text style={[styles.metricValue, { color: paperTheme.colors.primary }]}>
              {formatMoney(csvLastMonth.sales)}
            </Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Cost</Text>
            <Text style={[styles.metricValue, { color: paperTheme.colors.onSurface }]}>
              {formatMoney(csvLastMonth.cost)}
            </Text>
          </View>
          <View style={[styles.metricCell, styles.lastCsvMarginRow]}>
            <Text style={[styles.metricLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Margin</Text>
            <Text style={[styles.metricValue, { color: paperTheme.colors.onSurface }]}>
              {csvMarginPct != null ? `${csvMarginPct.toFixed(2)}%` : '—'}
            </Text>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.card, styles.errorCard, { borderColor: paperTheme.colors.error }]}>
          <Ionicons name="cloud-offline-outline" size={40} color={paperTheme.colors.error} />
          <Text style={[styles.errorTitle, { color: paperTheme.colors.onSurface }]}>Forecast unavailable</Text>
          <Text style={[styles.errorBody, { color: paperTheme.colors.onSurfaceVariant }]}>{error}</Text>
          <Text style={[styles.hint, { color: paperTheme.colors.onSurfaceVariant }]}>
            Run Analysis_Backend on port 8000 and set ANALYSIS_SERVICE_URL on the Node server if needed.
          </Text>
        </View>
      ) : null}

      {forecast && statusStyle ? (
        <>
          {forecast.lastHistoryMonth != null &&
          forecast.lastMonthSales != null &&
          forecast.lastMonthProfit != null &&
          forecast.lastMonthMarginPercent != null ? (
            <>
              <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Compare: last month vs forecast
              </Text>
              <ForecastMarginStatusRow
                forecast={forecast}
                statusStyle={statusStyle}
                onSurface={paperTheme.colors.onSurface}
              />
              <Text style={styles.forecastMarginUnderTitle}>
                <Text style={[styles.forecastMarginLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Forecast margin ({forecast.targetMonth}){' '}
                </Text>
                <Text style={[styles.forecastMarginValue, { color: statusStyle.fg }]}>{forecast.marginPercent}%</Text>
              </Text>
              <View style={[styles.compareCard, { backgroundColor: paperTheme.colors.surface }]}>
                <View style={[styles.compareHeaderRow, { borderBottomColor: paperTheme.colors.outline }]}>
                  <View style={styles.compareCorner} />
                  <View style={styles.compareHeadCol}>
                    <Text style={[styles.compareHeadTitle, { color: paperTheme.colors.onSurface }]}>Last</Text>
                    <Text style={[styles.compareHeadSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                      {forecast.lastHistoryMonth}
                    </Text>
                  </View>
                  <View style={styles.compareHeadCol}>
                    <Text style={[styles.compareHeadTitle, { color: paperTheme.colors.onSurface }]}>Forecast</Text>
                    <Text style={[styles.compareHeadSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                      {forecast.targetMonth}
                    </Text>
                  </View>
                </View>

                <View style={styles.compareDataRow}>
                  <Text style={[styles.compareLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Sales</Text>
                  <Text style={[styles.compareValue, { color: paperTheme.colors.onSurface }]}>
                    {formatMoney(forecast.lastMonthSales)}
                  </Text>
                  <Text style={[styles.compareValue, { color: paperTheme.colors.primary }]}>
                    {formatMoney(forecast.predictedSales)}
                  </Text>
                </View>
                <Text style={[styles.compareDelta, { color: paperTheme.colors.tertiary }]}>
                  Change: {formatDeltaMoney(forecast.lastMonthSales, forecast.predictedSales)}
                </Text>

                <View style={[styles.compareDataRow, styles.compareRowSpaced]}>
                  <Text style={[styles.compareLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Profit</Text>
                  <Text style={[styles.compareValue, { color: paperTheme.colors.onSurface }]}>
                    {formatMoney(forecast.lastMonthProfit)}
                  </Text>
                  <Text style={[styles.compareValue, { color: paperTheme.colors.onSurface }]}>
                    {formatMoney(forecast.predictedProfit)}
                  </Text>
                </View>
                <Text style={[styles.compareDelta, { color: paperTheme.colors.tertiary }]}>
                  Change: {formatDeltaMoney(forecast.lastMonthProfit, forecast.predictedProfit)}
                </Text>

                <View style={[styles.compareDataRow, styles.compareRowSpaced]}>
                  <Text style={[styles.compareLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Margin</Text>
                  <Text style={[styles.compareValue, { color: paperTheme.colors.onSurface }]}>
                    {forecast.lastMonthMarginPercent}%
                  </Text>
                  <Text style={[styles.compareValue, { color: paperTheme.colors.onSurface }]}>
                    {forecast.marginPercent}%
                  </Text>
                </View>
                <Text style={[styles.compareDelta, { color: paperTheme.colors.tertiary }]}>
                  Change: {formatDeltaMargin(forecast.lastMonthMarginPercent, forecast.marginPercent)}
                </Text>

                {forecast.lastMonthCost != null ? (
                  <View style={[styles.compareDataRow, styles.compareRowSpaced]}>
                    <Text style={[styles.compareLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Cost</Text>
                    <Text style={[styles.compareValue, { color: paperTheme.colors.onSurface }]}>
                      {formatMoney(forecast.lastMonthCost)}
                    </Text>
                    <Text style={[styles.compareValue, { color: paperTheme.colors.onSurface }]}>
                      {formatMoney(forecast.predictedCost)}
                    </Text>
                  </View>
                ) : null}
                {forecast.lastMonthCost != null ? (
                  <Text style={[styles.compareDelta, { color: paperTheme.colors.tertiary }]}>
                    Change: {formatDeltaMoney(forecast.lastMonthCost, forecast.predictedCost)}
                  </Text>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Forecast · {forecast.targetMonth}
              </Text>
              <ForecastMarginStatusRow
                forecast={forecast}
                statusStyle={statusStyle}
                onSurface={paperTheme.colors.onSurface}
              />
              <Text style={styles.forecastMarginUnderTitle}>
                <Text style={[styles.forecastMarginLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Forecast margin{' '}
                </Text>
                <Text style={[styles.forecastMarginValue, { color: statusStyle.fg }]}>{forecast.marginPercent}%</Text>
              </Text>
              <View style={[styles.metricsGrid, { backgroundColor: paperTheme.colors.surface }]}>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Pred. sales</Text>
                  <Text style={[styles.metricValue, { color: paperTheme.colors.primary }]}>
                    {formatMoney(forecast.predictedSales)}
                  </Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Pred. cost</Text>
                  <Text style={[styles.metricValue, { color: paperTheme.colors.onSurface }]}>
                    {formatMoney(forecast.predictedCost)}
                  </Text>
                </View>
                <View style={[styles.metricCell, styles.metricFull]}>
                  <Text style={[styles.metricLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Pred. profit</Text>
                  <Text style={[styles.metricValue, { color: paperTheme.colors.onSurface }]}>
                    {formatMoney(forecast.predictedProfit)}
                  </Text>
                </View>
              </View>
            </>
          )}

          {forecast.accuracy &&
          (forecast.accuracy.salesMae != null || forecast.accuracy.costMae != null) ? (
            <View style={[styles.accuracyCard, { backgroundColor: paperTheme.colors.surface }]}>
              <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Forecast accuracy (hold-out)
              </Text>
              {forecast.accuracy.holdoutMonths != null ? (
                <Text style={[styles.accuracyHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Trained on older months; last {forecast.accuracy.holdoutMonths} month
                  {forecast.accuracy.holdoutMonths === 1 ? '' : 's'} held back for error measurement (same run as the
                  saved model).
                </Text>
              ) : null}
              {forecast.accuracy.salesMae != null ? (
                <View style={styles.metricCell}>
                  <Text style={[styles.metricLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Sales MAE</Text>
                  <Text style={[styles.metricValue, { color: paperTheme.colors.onSurface }]}>
                    {formatMoney(forecast.accuracy.salesMae)}
                  </Text>
                </View>
              ) : null}
              {forecast.accuracy.costMae != null ? (
                <View style={styles.metricCell}>
                  <Text style={[styles.metricLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Cost MAE</Text>
                  <Text style={[styles.metricValue, { color: paperTheme.colors.onSurface }]}>
                    {formatMoney(forecast.accuracy.costMae)}
                  </Text>
                </View>
              ) : null}
              {forecast.accuracy.salesMapePercent != null ? (
                <View style={[styles.metricCell, styles.accuracyRowSpaced]}>
                  <Text style={[styles.metricLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Sales MAPE</Text>
                  <Text style={[styles.metricValue, { color: paperTheme.colors.primary }]}>
                    {forecast.accuracy.salesMapePercent.toFixed(2)}%
                  </Text>
                </View>
              ) : null}
              {forecast.accuracy.costMapePercent != null ? (
                <View style={styles.metricCell}>
                  <Text style={[styles.metricLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Cost MAPE</Text>
                  <Text style={[styles.metricValue, { color: paperTheme.colors.onSurface }]}>
                    {forecast.accuracy.costMapePercent.toFixed(2)}%
                  </Text>
                </View>
              ) : null}
              {forecast.accuracy.note ? (
                <Text style={[styles.bandsNote, { color: paperTheme.colors.onSurfaceVariant, marginTop: 10 }]}>
                  {forecast.accuracy.note}
                </Text>
              ) : null}
            </View>
          ) : null}

          {forecast.marginBands ? (
            <Text style={[styles.bandsNote, { color: paperTheme.colors.onSurfaceVariant }]}>
              Bands: GREEN ≥ {forecast.marginBands.greenMinPercent}% · YELLOW ≥ {forecast.marginBands.yellowMinPercent}% ·
              else RED
            </Text>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  heading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
    marginBottom: 8,
    marginTop: 8,
  },
  body: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  centered: { paddingVertical: 24, alignItems: 'center' },
  card: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  errorCard: {
    borderWidth: 1,
    alignItems: 'stretch',
  },
  errorTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    marginTop: 12,
  },
  errorBody: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  hint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    marginBottom: 16,
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 18,
    marginTop: 2,
  },
  marginPct: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
  },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginBottom: 8,
  },
  forecastMarginUnderTitle: {
    marginTop: -4,
    marginBottom: 12,
  },
  forecastMarginLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
  },
  forecastMarginValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  lastCsvCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
  lastCsvMonthLine: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 17,
    marginBottom: 10,
  },
  lastCsvYm: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
  },
  lastCsvMetric: {
    paddingTop: 4,
  },
  lastCsvMarginRow: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  accuracyCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 4,
    gap: 6,
  },
  accuracyHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  accuracyRowSpaced: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  metricsGrid: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  metricCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricFull: {
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  metricLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
  },
  metricValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  bandsNote: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
  compareCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 4,
  },
  compareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 10,
    marginBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compareCorner: { flex: 1.15 },
  compareHeadCol: { flex: 1, alignItems: 'flex-end' },
  compareHeadTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  compareHeadSub: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    marginTop: 2,
  },
  compareDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  compareRowSpaced: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  compareLabel: {
    flex: 1.15,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
  },
  compareValue: {
    flex: 1,
    fontFamily: fonts.PoppinsBold,
    fontSize: 13,
    textAlign: 'right',
  },
  compareDelta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginBottom: 8,
    opacity: 0.9,
  },
});
