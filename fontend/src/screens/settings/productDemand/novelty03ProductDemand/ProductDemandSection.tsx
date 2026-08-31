import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../../../context/ThemeContext';
import { useShopIndustry } from '../../../../hooks/useShopIndustry';
import { getApiErrorMessage } from '../../../../utils/apiErrorAlert';
import { fetchProductDemandForecast } from './productDemandService';
import {
  shareAllProductsDemandReport,
  shareBarChartReport,
  shareLineChartReport,
  sharePieChartReport,
} from './productDemandPdf';
import { productDemandStyles as styles } from './productDemandStyles';
import { clearSavedToken } from '../../../../utils/secureStorage';
import type { DemandHorizonKey, ProductDemandData, ProductDemandResult } from './productDemandTypes';

type ViewMode = 'line' | 'bar' | 'pie' | 'cards';

const PIE_COLORS = [
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#9333ea',
  '#06b6d4',
  '#ec4899',
  '#64748b',
  '#ef4444',
];

function describeMethod(method: string): string {
  if (method.startsWith('holt_winters')) return 'Holt-Winters (seasonal)';
  if (method.startsWith('holt_linear')) return 'Holt linear trend';
  if (method === 'linear_regression') return 'Linear regression';
  if (method === 'moving_average') return 'Moving average';
  return method;
}

function ProductDemandCard({
  result,
  surface,
  outline,
  onSurface,
  onSurfaceVariant,
  surfaceVariant,
  primary,
}: {
  result: ProductDemandResult;
  surface: string;
  outline: string;
  onSurface: string;
  onSurfaceVariant: string;
  surfaceVariant: string;
  primary: string;
}) {
  return (
    <View style={[styles.productCard, { backgroundColor: surface, borderColor: outline }]}>
      <View style={styles.productTopRow}>
        <View style={[styles.productIconWrap, { backgroundColor: `${primary}1f` }]}>
          <Ionicons name="fast-food-outline" size={18} color={primary} />
        </View>
        <Text style={[styles.productName, { color: onSurface }]} numberOfLines={1}>
          {result.productName}
        </Text>
      </View>

      <View style={styles.horizonRow}>
        {(
          [
            { key: 'next7Days', label: '7 days' },
            { key: 'next14Days', label: '14 days' },
            { key: 'next30Days', label: '30 days' },
          ] as const
        ).map(({ key, label }) => {
          const horizon = result.horizons[key];
          return (
            <View key={key} style={[styles.horizonCard, { backgroundColor: surfaceVariant }]}>
              <Text style={[styles.horizonLabel, { color: onSurfaceVariant }]}>{label}</Text>
              <Text style={[styles.horizonValue, { color: onSurface }]}>
                {horizon.totalPredictedUnits}
              </Text>
              <Text style={[styles.horizonRange, { color: onSurfaceVariant }]}>
                {horizon.lowerUnits}–{horizon.upperUnits}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.methodPill, { backgroundColor: `${primary}1a` }]}>
        <Text style={[styles.methodPillText, { color: primary }]}>{describeMethod(result.method)}</Text>
      </View>
    </View>
  );
}

export default function ProductDemandSection() {
  const { paperTheme } = useTheme();
  const { shop } = useShopIndustry();

  const [data, setData] = useState<ProductDemandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Dynamic live update controls
  const [viewMode, setViewMode] = useState<ViewMode>('line');
  const [selectedHorizon, setSelectedHorizon] = useState<DemandHorizonKey>('next7Days');
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');

  const screenWidth = Dimensions.get('window').width;

  const load = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await fetchProductDemandForecast();
      setData(result);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not load the product demand forecast. Please try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const surface = paperTheme.colors.surface;
  const outline = paperTheme.colors.outlineVariant;
  const onSurface = paperTheme.colors.onSurface;
  const onSurfaceVariant = paperTheme.colors.onSurfaceVariant;
  const surfaceVariant = paperTheme.colors.surfaceVariant;
  const primary = paperTheme.colors.primary;

  const filteredResults = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return data.results;
    return data.results.filter((result) => result.productName.toLowerCase().includes(normalizedQuery));
  }, [data, query]);

  // Selected product for chart focus
  const activeProduct = useMemo(() => {
    if (!data || selectedProductId === 'ALL') return null;
    return data.results.find(
      (r) => (r.productId ?? r.productName) === selectedProductId,
    ) ?? null;
  }, [data, selectedProductId]);

  // Forecast Days for Line Chart (7, 14, or 30 days)
  const horizonDays = useMemo(() => {
    if (selectedHorizon === 'next7Days') return 7;
    if (selectedHorizon === 'next14Days') return 14;
    return 30;
  }, [selectedHorizon]);

  // Prepare Line Chart Data
  const lineChartData = useMemo(() => {
    if (!data || !data.results.length) return null;

    // If a specific product is selected, show its daily points curve
    if (activeProduct && activeProduct.dailyPoints && activeProduct.dailyPoints.length) {
      const points = activeProduct.dailyPoints.slice(0, horizonDays);
      const labels = points.map((p, idx) => (idx % Math.ceil(horizonDays / 6) === 0 ? `D${p.day}` : ''));
      const predicted = points.map((p) => Math.max(0, Math.round(p.predicted)));
      const upper = points.map((p) => Math.max(0, Math.round(p.upper)));
      const lower = points.map((p) => Math.max(0, Math.round(p.lower)));

      return {
        labels,
        datasets: [
          {
            data: predicted,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            strokeWidth: 3,
          },
          {
            data: upper,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            strokeWidth: 1.5,
          },
          {
            data: lower,
            color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
            strokeWidth: 1.5,
          },
        ],
        legend: ['Predicted Demand', 'Upper Range', 'Lower Range'],
      };
    }

    // Aggregated top 5 products demand trajectory across days
    const topProducts = data.results.slice(0, 5);
    const labels = Array.from({ length: Math.min(horizonDays, 14) }, (_, i) => `D${i + 1}`);

    const aggregatedDaily = labels.map((_, dayIdx) => {
      let sum = 0;
      topProducts.forEach((prod) => {
        if (prod.dailyPoints && prod.dailyPoints[dayIdx]) {
          sum += prod.dailyPoints[dayIdx].predicted;
        }
      });
      return Math.round(sum);
    });

    return {
      labels: labels.map((l, i) => (i % 2 === 0 ? l : '')),
      datasets: [
        {
          data: aggregatedDaily.length ? aggregatedDaily : [0],
          color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
          strokeWidth: 3,
        },
      ],
      legend: ['Combined Top Products Demand'],
    };
  }, [data, activeProduct, horizonDays]);

  // Prepare Bar Chart Data (Top 6 products comparison for selected horizon)
  const barChartData = useMemo(() => {
    if (!data || !data.results.length) return null;

    const sourceList = filteredResults.length ? filteredResults : data.results;
    const topProducts = sourceList.slice(0, 6);

    const labels = topProducts.map((p) =>
      p.productName.length > 8 ? `${p.productName.slice(0, 7)}…` : p.productName,
    );
    const values = topProducts.map((p) => p.horizons[selectedHorizon]?.totalPredictedUnits ?? 0);

    return {
      labels: labels.length ? labels : ['None'],
      datasets: [
        {
          data: values.length ? values : [0],
        },
      ],
    };
  }, [data, filteredResults, selectedHorizon]);

  // Prepare Pie / Donut Chart Data (Market share % of store demand per product)
  const pieChartData = useMemo(() => {
    if (!data || !data.results.length) return null;

    const sourceList = filteredResults.length ? filteredResults : data.results;
    const topProducts = sourceList.slice(0, 6);

    return topProducts.map((prod, index) => ({
      name: prod.productName.length > 10 ? `${prod.productName.slice(0, 9)}…` : prod.productName,
      population: prod.horizons[selectedHorizon]?.totalPredictedUnits ?? 0,
      color: PIE_COLORS[index % PIE_COLORS.length],
      legendFontColor: onSurfaceVariant,
      legendFontSize: 11,
    }));
  }, [data, filteredResults, selectedHorizon, onSurfaceVariant]);

  // Separate report downloads for each view mode
  const handleDownloadReportForMode = useCallback(async (modeToExport: ViewMode) => {
    if (!data || !data.results.length) return;
    setDownloadingReport(true);
    try {
      if (modeToExport === 'line') {
        await shareLineChartReport({
          results: data.results,
          selectedProduct: activeProduct,
          horizonDays,
          shop,
          generatedAt: data.generatedAt,
        });
      } else if (modeToExport === 'bar') {
        await shareBarChartReport({
          results: data.results,
          selectedHorizon,
          shop,
          generatedAt: data.generatedAt,
        });
      } else if (modeToExport === 'pie') {
        await sharePieChartReport({
          results: data.results,
          selectedHorizon,
          shop,
          generatedAt: data.generatedAt,
        });
      } else {
        await shareAllProductsDemandReport({
          results: data.results,
          shop,
          generatedAt: data.generatedAt,
          lookbackDays: data.lookbackDays,
        });
      }
    } catch (err: unknown) {
      Alert.alert('Could not create report', getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setDownloadingReport(false);
    }
  }, [data, activeProduct, horizonDays, selectedHorizon, shop]);

  if (loading) {
    return (
      <View style={[styles.productCard, { backgroundColor: surface, borderColor: outline }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={[styles.loadingText, { color: onSurfaceVariant }]}>
            Analysing sales history for every product…
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.noticeCard,
          { backgroundColor: paperTheme.colors.errorContainer, borderColor: `${paperTheme.colors.error}33` },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={18} color={paperTheme.colors.error} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.noticeText, { color: paperTheme.colors.onErrorContainer }]}>{error}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => void load(false)}
            style={[styles.retryBtn, { backgroundColor: paperTheme.colors.error }]}
          >
            <Ionicons name="refresh" size={15} color={paperTheme.colors.onError} />
            <Text style={[styles.retryBtnText, { color: paperTheme.colors.onError }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!data) return null;

  if (data.dataQuality.level === 'insufficient' || !data.results.length) {
    return (
      <View style={[styles.noticeCard, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
        <Ionicons name="information-circle-outline" size={18} color="#b45309" />
        <Text style={[styles.noticeText, { color: '#92400e' }]}>{data.dataQuality.message}</Text>
      </View>
    );
  }

  // Horizon label helper
  const horizonTitle = selectedHorizon === 'next7Days' ? '7-Day' : selectedHorizon === 'next14Days' ? '14-Day' : '30-Day';

  return (
    <>
      {/* Live Updates & ML Engine Header */}
      <View style={styles.liveHeaderRow}>
        <View style={styles.engineBadgeRow}>
          <View style={[styles.engineBadge, { backgroundColor: '#dcfce7' }]}>
            <View style={styles.liveDot} />
            <Ionicons name="logo-python" size={13} color="#15803d" />
            <Text style={[styles.engineBadgeText, { color: '#15803d' }]}>Python · Live ML</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          disabled={refreshing}
          onPress={() => void load(true)}
          style={[styles.refreshLiveBtn, { backgroundColor: surfaceVariant, borderColor: outline }]}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={primary} />
          ) : (
            <Ionicons name="refresh" size={13} color={primary} />
          )}
          <Text style={[styles.refreshLiveBtnText, { color: primary }]}>
            {refreshing ? 'Updating…' : 'Live Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Tabs: Line Chart | Bar Chart | Pie Chart | Cards View */}
      <View style={[styles.viewModeRow, { backgroundColor: surfaceVariant, borderColor: outline }]}>
        {(
          [
            { mode: 'line', label: 'Line', icon: 'stats-chart-outline' },
            { mode: 'bar', label: 'Bar', icon: 'bar-chart-outline' },
            { mode: 'pie', label: 'Share', icon: 'pie-chart-outline' },
            { mode: 'cards', label: 'Cards', icon: 'grid-outline' },
          ] as const
        ).map(({ mode, label, icon }) => {
          const isActive = viewMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              activeOpacity={0.8}
              onPress={() => setViewMode(mode)}
              style={[
                styles.viewModeBtn,
                isActive && [styles.viewModeBtnActive, { backgroundColor: surface }],
              ]}
            >
              <Ionicons
                name={icon}
                size={14}
                color={isActive ? primary : onSurfaceVariant}
              />
              <Text
                style={[
                  styles.viewModeText,
                  { color: isActive ? primary : onSurfaceVariant },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Horizon Selector (7 Days / 14 Days / 30 Days) */}
      <View style={styles.horizonPillRow}>
        {(
          [
            { key: 'next7Days', label: '7 Days' },
            { key: 'next14Days', label: '14 Days' },
            { key: 'next30Days', label: '30 Days' },
          ] as const
        ).map(({ key, label }) => {
          const isActive = selectedHorizon === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.75}
              onPress={() => setSelectedHorizon(key)}
              style={[
                styles.horizonPill,
                {
                  backgroundColor: isActive ? primary : surface,
                  borderColor: isActive ? primary : outline,
                },
              ]}
            >
              <Text
                style={[
                  styles.horizonPillText,
                  { color: isActive ? '#ffffff' : onSurface },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Product Chips Selector for Live Filtering */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.productChipScroll}
        contentContainerStyle={styles.productChipContainer}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedProductId('ALL')}
          style={[
            styles.productChip,
            {
              backgroundColor: selectedProductId === 'ALL' ? `${primary}20` : surface,
              borderColor: selectedProductId === 'ALL' ? primary : outline,
            },
          ]}
        >
          <Text
            style={[
              styles.productChipText,
              { color: selectedProductId === 'ALL' ? primary : onSurface },
            ]}
          >
            All Products ({data.results.length})
          </Text>
        </TouchableOpacity>

        {data.results.map((result) => {
          const pId = result.productId ?? result.productName;
          const isSelected = selectedProductId === pId;
          return (
            <TouchableOpacity
              key={pId}
              activeOpacity={0.8}
              onPress={() => setSelectedProductId(pId)}
              style={[
                styles.productChip,
                {
                  backgroundColor: isSelected ? `${primary}20` : surface,
                  borderColor: isSelected ? primary : outline,
                },
              ]}
            >
              <Text
                style={[
                  styles.productChipText,
                  { color: isSelected ? primary : onSurface },
                ]}
              >
                {result.productName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* LINE CHART VIEW */}
      {viewMode === 'line' && (
        <View style={[styles.chartCardContainer, { backgroundColor: surface, borderColor: outline }]}>
          <View style={styles.chartTitleRow}>
            <Text style={[styles.chartTitle, { color: onSurface }]}>
              {activeProduct ? activeProduct.productName : 'Product Demand Forecast Trajectory'}
            </Text>
            <View style={[styles.methodPill, { backgroundColor: `${primary}1a` }]}>
              <Text style={[styles.methodPillText, { color: primary }]}>
                {activeProduct ? describeMethod(activeProduct.method) : 'Holt-Winters / Regression'}
              </Text>
            </View>
          </View>

          <Text style={[styles.chartSubtitle, { color: onSurfaceVariant }]}>
            {activeProduct
              ? `Daily predicted demand curve over the next ${horizonDays} days`
              : `Aggregated daily demand trajectory for top products over ${horizonDays} days`}
          </Text>

          {lineChartData ? (
            <>
              <View style={styles.chartWrap}>
                <LineChart
                  data={lineChartData}
                  width={Math.max(300, screenWidth - 64)}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: surface,
                    backgroundGradientFrom: surface,
                    backgroundGradientTo: surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                    labelColor: () => onSurfaceVariant,
                    style: { borderRadius: 16 },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '1.5',
                      stroke: primary,
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '4',
                      stroke: outline,
                    },
                  }}
                  bezier
                  style={{ borderRadius: 16 }}
                />
              </View>

              {activeProduct && (
                <View style={styles.chartStatRow}>
                  <View style={[styles.chartStatCard, { backgroundColor: surfaceVariant }]}>
                    <Text style={[styles.chartStatValue, { color: '#2563eb' }]}>
                      {activeProduct.horizons[selectedHorizon]?.totalPredictedUnits ?? 0}
                    </Text>
                    <Text style={[styles.chartStatLabel, { color: onSurfaceVariant }]}>
                      Predicted ({horizonTitle})
                    </Text>
                  </View>
                  <View style={[styles.chartStatCard, { backgroundColor: surfaceVariant }]}>
                    <Text style={[styles.chartStatValue, { color: '#22c55e' }]}>
                      {activeProduct.horizons[selectedHorizon]?.upperUnits ?? 0}
                    </Text>
                    <Text style={[styles.chartStatLabel, { color: onSurfaceVariant }]}>
                      Upper Bound
                    </Text>
                  </View>
                  <View style={[styles.chartStatCard, { backgroundColor: surfaceVariant }]}>
                    <Text style={[styles.chartStatValue, { color: '#ef4444' }]}>
                      {activeProduct.horizons[selectedHorizon]?.lowerUnits ?? 0}
                    </Text>
                    <Text style={[styles.chartStatLabel, { color: onSurfaceVariant }]}>
                      Lower Bound
                    </Text>
                  </View>
                </View>
              )}

              {/* DEDICATED LINE CHART DOWNLOAD BUTTON */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={downloadingReport}
                onPress={() => void handleDownloadReportForMode('line')}
                style={[styles.downloadAllBtn, { backgroundColor: primary, marginTop: 14, marginBottom: 0 }]}
              >
                {downloadingReport ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="download-outline" size={16} color="#ffffff" />
                )}
                <Text style={[styles.downloadAllBtnText, { color: '#ffffff' }]}>
                  {downloadingReport ? 'Preparing report…' : 'Download Line Chart Report'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.noticeText, { color: onSurfaceVariant }]}>No line chart data available.</Text>
          )}
        </View>
      )}

      {/* BAR CHART VIEW */}
      {viewMode === 'bar' && (
        <View style={[styles.chartCardContainer, { backgroundColor: surface, borderColor: outline }]}>
          <View style={styles.chartTitleRow}>
            <Text style={[styles.chartTitle, { color: onSurface }]}>
              {horizonTitle} Demand Comparison
            </Text>
            <View style={[styles.methodPill, { backgroundColor: `${primary}1a` }]}>
              <Text style={[styles.methodPillText, { color: primary }]}>Units Forecast</Text>
            </View>
          </View>

          <Text style={[styles.chartSubtitle, { color: onSurfaceVariant }]}>
            Comparing predicted demand units across products for the {horizonTitle.toLowerCase()} horizon
          </Text>

          {barChartData ? (
            <>
              <View style={styles.chartWrap}>
                <BarChart
                  data={barChartData}
                  width={Math.max(300, screenWidth - 64)}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=" u"
                  chartConfig={{
                    backgroundColor: surface,
                    backgroundGradientFrom: surface,
                    backgroundGradientTo: surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => primary,
                    labelColor: () => onSurfaceVariant,
                    style: { borderRadius: 16 },
                    propsForBackgroundLines: {
                      strokeDasharray: '4',
                      stroke: outline,
                    },
                  }}
                  showValuesOnTopOfBars
                  style={{ borderRadius: 16 }}
                />
              </View>

              {/* DEDICATED BAR CHART DOWNLOAD BUTTON */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={downloadingReport}
                onPress={() => void handleDownloadReportForMode('bar')}
                style={[styles.downloadAllBtn, { backgroundColor: primary, marginTop: 14, marginBottom: 0 }]}
              >
                {downloadingReport ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="download-outline" size={16} color="#ffffff" />
                )}
                <Text style={[styles.downloadAllBtnText, { color: '#ffffff' }]}>
                  {downloadingReport ? 'Preparing report…' : `Download ${horizonTitle} Bar Chart Report`}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.noticeText, { color: onSurfaceVariant }]}>No bar chart data available.</Text>
          )}
        </View>
      )}

      {/* PIE / SHARE CHART VIEW */}
      {viewMode === 'pie' && (
        <View style={[styles.chartCardContainer, { backgroundColor: surface, borderColor: outline }]}>
          <View style={styles.chartTitleRow}>
            <Text style={[styles.chartTitle, { color: onSurface }]}>
              {horizonTitle} Demand Share
            </Text>
            <View style={[styles.methodPill, { backgroundColor: `${primary}1a` }]}>
              <Text style={[styles.methodPillText, { color: primary }]}>Market Share</Text>
            </View>
          </View>

          <Text style={[styles.chartSubtitle, { color: onSurfaceVariant }]}>
            Share of store predicted unit sales per product for the {horizonTitle.toLowerCase()} horizon
          </Text>

          {pieChartData ? (
            <>
              <View style={styles.chartWrap}>
                <PieChart
                  data={pieChartData}
                  width={Math.max(300, screenWidth - 64)}
                  height={200}
                  chartConfig={{
                    color: (opacity = 1) => primary,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>

              {/* DEDICATED SHARE CHART DOWNLOAD BUTTON */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={downloadingReport}
                onPress={() => void handleDownloadReportForMode('pie')}
                style={[styles.downloadAllBtn, { backgroundColor: primary, marginTop: 14, marginBottom: 0 }]}
              >
                {downloadingReport ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="download-outline" size={16} color="#ffffff" />
                )}
                <Text style={[styles.downloadAllBtnText, { color: '#ffffff' }]}>
                  {downloadingReport ? 'Preparing report…' : `Download ${horizonTitle} Share Report`}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.noticeText, { color: onSurfaceVariant }]}>No share chart data available.</Text>
          )}
        </View>
      )}

      {/* CARDS VIEW / DETAILED LIST */}
      {(viewMode === 'cards' || query.length > 0) && (
        <>
          <View style={[styles.searchWrap, { backgroundColor: surface, borderColor: outline }]}>
            <Ionicons name="search-outline" size={17} color={onSurfaceVariant} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search products…"
              placeholderTextColor={onSurfaceVariant}
              style={[styles.searchInput, { color: onSurface }]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={17} color={onSurfaceVariant} />
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={[styles.resultsCount, { color: onSurfaceVariant }]}>
            Showing {filteredResults.length} of {data.results.length} product
            {data.results.length === 1 ? '' : 's'}
          </Text>

          {filteredResults.length ? (
            filteredResults.map((result) => (
              <ProductDemandCard
                key={result.productId ?? result.productName}
                result={result}
                surface={surface}
                outline={outline}
                onSurface={onSurface}
                onSurfaceVariant={onSurfaceVariant}
                surfaceVariant={surfaceVariant}
                primary={primary}
              />
            ))
          ) : (
            <View style={[styles.noticeCard, { backgroundColor: surfaceVariant, borderColor: outline }]}>
              <Ionicons name="search-outline" size={18} color={onSurfaceVariant} />
              <Text style={[styles.noticeText, { color: onSurfaceVariant }]}>
                No products match &ldquo;{query}&rdquo;.
              </Text>
            </View>
          )}

          {/* DEDICATED CARDS VIEW DOWNLOAD BUTTON */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={downloadingReport}
            onPress={() => void handleDownloadReportForMode('cards')}
            style={[styles.downloadAllBtn, { backgroundColor: primary }]}
          >
            {downloadingReport ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="download-outline" size={16} color="#ffffff" />
            )}
            <Text style={[styles.downloadAllBtnText, { color: '#ffffff' }]}>
              {downloadingReport
                ? 'Preparing report…'
                : `Download Full Product Cards Report (${data.results.length} products)`}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={[styles.footNote, { color: paperTheme.colors.outline }]}>
        Generated {new Date(data.generatedAt).toLocaleString('en-LK')} · based on the last{' '}
        {data.lookbackDays} days history
      </Text>
    </>
  );
}
