import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../../../context/ThemeContext';
import { getApiErrorMessage } from '../../../../utils/apiErrorAlert';
import { fetchCustomerBehaviorInsights } from './behaviorService';
import {
  printCustomerBehaviorA4Report,
  shareCustomerBehaviorPdfReport,
  type ReportPrintOptions,
} from './behaviorReportPrinter';
import { behaviorStyles as styles } from './behaviorStyles';
import type {
  BehaviorInsight,
  BehaviorInsightTone,
  BehaviorInsightType,
  CustomerBehaviorData,
  CustomerSegment,
  HourBucket,
  ProductRankingEntry,
  SalesTrend,
  TrendPoint,
  WeekendVsWeekday,
} from './behaviorTypes';

const TONE_COLORS: Record<BehaviorInsightTone, { bg: string; text: string }> = {
  positive: { bg: '#dcfce7', text: '#15803d' },
  negative: { bg: '#fee2e2', text: '#b91c1c' },
  warning: { bg: '#fef3c7', text: '#b45309' },
  info: { bg: '#e0f2fe', text: '#0284c7' },
  neutral: { bg: '#ede9fe', text: '#6d28d9' },
};

const INSIGHT_ICONS: Record<BehaviorInsightType, keyof typeof Ionicons.glyphMap> = {
  peak_hour: 'time-outline',
  weekend_weekday: 'calendar-outline',
  top_product: 'trending-up-outline',
  slow_product: 'trending-down-outline',
  trend: 'analytics-outline',
  segment_top: 'ribbon-outline',
  segment_lapsed: 'alert-circle-outline',
  identified_share: 'people-outline',
};

const SEGMENT_COLORS: Record<string, string> = {
  'VIP / Loyal': '#16a34a',
  Regular: '#2563eb',
  Occasional: '#f59e0b',
  'At risk / Lapsed': '#ef4444',
};
const DEFAULT_SEGMENT_COLOR = '#94a3b8';

const RANK_STYLES = [
  { bg: '#ECE3D2', text: '#90733B' },
  { bg: '#E9DFDB', text: '#926F65' },
  { bg: '#F6E1DA', text: '#C26144' },
];

interface DateFilterOption {
  label: string;
  days: number;
  subtitle: string;
}

const DATE_FILTERS: DateFilterOption[] = [
  { label: '1D', days: 1, subtitle: 'Today (Real-time Shift)' },
  { label: '3D', days: 3, subtitle: 'Last 3 Days (Recent Rush)' },
  { label: '7D', days: 7, subtitle: 'Last 7 Days (Weekly Pattern)' },
  { label: '2W', days: 14, subtitle: 'Last 2 Weeks (Bi-weekly Cycle)' },
  { label: '1M', days: 30, subtitle: 'Last 1 Month (Monthly Snapshot)' },
  { label: '6M', days: 180, subtitle: 'Last 6 Months (Half-Year Baseline)' },
  { label: '1Y', days: 365, subtitle: 'Last 1 Year (Annual History)' },
];

const PRINTABLE_FEATURES = [
  { key: 'includeKpis' as keyof ReportPrintOptions, title: 'Executive KPIs', sub: 'Revenue, orders, AOV & link rate', icon: 'speedometer-outline' as keyof typeof Ionicons.glyphMap, tint: '#ea580c' },
  { key: 'includeInsights' as keyof ReportPrintOptions, title: 'Executive Findings', sub: 'Plain-language bullet summaries', icon: 'bulb-outline' as keyof typeof Ionicons.glyphMap, tint: '#f59e0b' },
  { key: 'includeHourly' as keyof ReportPrintOptions, title: 'Busiest Hours Chart', sub: '24-hour distribution bar chart & peak', icon: 'time-outline' as keyof typeof Ionicons.glyphMap, tint: '#2563eb' },
  { key: 'includeWeekendWeekday' as keyof ReportPrintOptions, title: 'Weekend vs Weekday', sub: 'Proportional sales comparison split', icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap, tint: '#7c3aed' },
  { key: 'includeProducts' as keyof ReportPrintOptions, title: 'Top & Slow Products', sub: 'Volume progress bars leaderboard', icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap, tint: '#16a34a' },
  { key: 'includeUpcoming' as keyof ReportPrintOptions, title: 'Upcoming Selling Items', sub: 'Shift customer demand prep advice', icon: 'flame-outline' as keyof typeof Ionicons.glyphMap, tint: '#f97316' },
  { key: 'includeSegments' as keyof ReportPrintOptions, title: 'Customer Segmentation', sub: 'RFM + k-means clustering donut chart', icon: 'people-outline' as keyof typeof Ionicons.glyphMap, tint: '#0284c7' },
  { key: 'includeTrend' as keyof ReportPrintOptions, title: 'Sales Trend Trajectory', sub: 'OLS regression & monthly momentum', icon: 'analytics-outline' as keyof typeof Ionicons.glyphMap, tint: '#10b981' },
  { key: 'includeStrategies' as keyof ReportPrintOptions, title: 'Actionable Strategies', sub: 'AI business recommendations & combos', icon: 'sparkles-outline' as keyof typeof Ionicons.glyphMap, tint: '#8b5cf6' },
] as const;

function formatCurrency(value: number): string {
  return `Rs. ${Math.round(value).toLocaleString('en-LK')}`;
}

function formatShortNum(val: number): string {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${Math.round(val / 1000)}k`;
  return `${Math.round(val)}`;
}

function SalesTrajectoryChart({
  trend,
  selectedPoint,
  onSelectPoint,
  onSurface,
  onSurfaceVariant,
  outline,
  primary,
}: {
  trend: SalesTrend;
  selectedPoint: TrendPoint | null;
  onSelectPoint: (point: TrendPoint) => void;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  primary: string;
}) {
  const points = (trend.points ?? []).filter((p) => p && !isNaN(p.sales));
  if (!points.length) return null;

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(Math.min(screenWidth - 48, 380), 300);
  const chartHeight = 220;
  const marginLeft = 46;
  const marginRight = 24;
  const marginTop = 24;
  const marginBottom = 34;

  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  const targetVal = trend.target || trend.baselineAverage || 100;
  const rawMax = Math.max(
    ...points.map((p) => Math.max(p.sales, p.rollingAvg ?? 0)),
    targetVal,
    100,
  );
  const maxVal = Math.max(100, Math.ceil(rawMax * 1.15));
  const yTicks = [
    0,
    Math.round(maxVal * 0.25),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.75),
    maxVal,
  ];

  const N = points.length;
  const step = plotWidth / Math.max(N, 1);
  const barWidth = Math.min(Math.max(step * 0.68, 14), 32);

  const targetY = marginTop + plotHeight - (targetVal / maxVal) * plotHeight;

  const lineCoords = points.map((p, i) => {
    const cx = marginLeft + i * step + step / 2;
    const cy = marginTop + plotHeight - ((p.rollingAvg ?? p.sales) / maxVal) * plotHeight;
    return { cx, cy };
  });

  const pathData =
    lineCoords.length > 1
      ? lineCoords.reduce((acc, curr, idx, arr) => {
        if (idx === 0) return `M ${curr.cx} ${curr.cy}`;
        const prev = arr[idx - 1];
        const cp1x = prev.cx + (curr.cx - prev.cx) / 2;
        const cp1y = prev.cy;
        const cp2x = prev.cx + (curr.cx - prev.cx) / 2;
        const cp2y = curr.cy;
        return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.cx} ${curr.cy}`;
      }, '')
      : '';

  return (
    <View style={{ alignItems: 'center', marginVertical: 6 }}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Horizontal Background Grid Lines */}
        {yTicks.map((tick, tIdx) => {
          const ty = marginTop + plotHeight - (tick / maxVal) * plotHeight;
          return (
            <G key={`grid-${tIdx}`}>
              <Line
                x1={marginLeft}
                y1={ty}
                x2={chartWidth - marginRight + 6}
                y2={ty}
                stroke={outline}
                strokeWidth="0.8"
                strokeDasharray="3, 3"
                opacity={0.6}
              />
              <Line
                x1={marginLeft - 4}
                y1={ty}
                x2={marginLeft}
                y2={ty}
                stroke={onSurfaceVariant}
                strokeWidth="1.5"
              />
              <SvgText
                x={marginLeft - 7}
                y={ty + 3.5}
                fontSize="9"
                fill={onSurfaceVariant}
                textAnchor="end"
                fontFamily="Poppins-Medium"
              >
                {tIdx === 4 ? `Rs.${formatShortNum(tick)}` : formatShortNum(tick)}
              </SvgText>
            </G>
          );
        })}

        {/* Y Axis line */}
        <Line
          x1={marginLeft}
          y1={marginTop - 4}
          x2={marginLeft}
          y2={marginTop + plotHeight}
          stroke={onSurfaceVariant}
          strokeWidth="1.5"
        />

        {/* X Axis line */}
        <Line
          x1={marginLeft}
          y1={marginTop + plotHeight}
          x2={chartWidth - marginRight + 6}
          y2={marginTop + plotHeight}
          stroke={onSurfaceVariant}
          strokeWidth="1.5"
        />

        {/* Vertical Bars */}
        {points.map((p, i) => {
          const bx = marginLeft + i * step + (step - barWidth) / 2;
          const barHeight = Math.max((p.sales / maxVal) * plotHeight, 4);
          const by = marginTop + plotHeight - barHeight;
          const isSelected = selectedPoint?.label === p.label;
          const barColor = isSelected ? '#f97316' : '#3b4d66';

          return (
            <G key={`bar-${p.label}-${i}`} onPress={() => onSelectPoint(p)}>
              <Rect
                x={bx}
                y={by}
                width={barWidth}
                height={barHeight}
                rx="4"
                ry="4"
                fill={barColor}
                stroke={isSelected ? '#ea580c' : 'transparent'}
                strokeWidth={isSelected ? 1.5 : 0}
              />
              {/* Number inside bar if tall enough, else above bar */}
              {barHeight >= 20 ? (
                <SvgText
                  x={bx + barWidth / 2}
                  y={by + barHeight / 2 + 3.5}
                  fontSize="9.5"
                  fontWeight="bold"
                  fill="#ffffff"
                  textAnchor="middle"
                >
                  {formatShortNum(p.sales)}
                </SvgText>
              ) : (
                <SvgText
                  x={bx + barWidth / 2}
                  y={by - 3}
                  fontSize="8.5"
                  fontWeight="bold"
                  fill={onSurfaceVariant}
                  textAnchor="middle"
                >
                  {formatShortNum(p.sales)}
                </SvgText>
              )}

              {/* X Axis Label */}
              <SvgText
                x={bx + barWidth / 2}
                y={marginTop + plotHeight + 15}
                fontSize="9"
                fontWeight={isSelected ? 'bold' : 'normal'}
                fill={isSelected ? '#f97316' : onSurfaceVariant}
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            </G>
          );
        })}

        {/* Target Horizontal Baseline Line */}
        <Line
          x1={marginLeft}
          y1={targetY}
          x2={chartWidth - marginRight + 6}
          y2={targetY}
          stroke="#f59e0b"
          strokeWidth="1.8"
          strokeDasharray="5, 3"
        />
        <SvgText
          x={chartWidth - marginRight + 8}
          y={targetY - 4}
          fontSize="8"
          fontWeight="bold"
          fill="#d97706"
          textAnchor="end"
        >
          Target Rs.{formatShortNum(targetVal)}
        </SvgText>

        {/* Rolling Average Smooth Path */}
        {pathData ? (
          <Path
            d={pathData}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : null}

        {/* Circles on vertices */}
        {lineCoords.map((pt, pIdx) => (
          <Circle
            key={`dot-${pIdx}`}
            cx={pt.cx}
            cy={pt.cy}
            r="3.5"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        ))}
      </Svg>

      {/* Graph Legend below chart */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          marginTop: 6,
          flexWrap: 'wrap',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View
            style={{
              width: 11,
              height: 11,
              borderRadius: 3,
              backgroundColor: '#F6E1DA',
              borderWidth: 1,
              borderColor: '#C26144',
            }}
          />
          <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 10, color: onSurfaceVariant }}>
            Period Revenue
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: '#15803D' }} />
          <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 10, color: '#15803D' }}>
            Rolling Average
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 14, height: 2.5, borderRadius: 2, backgroundColor: '#90733B' }} />
          <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 10, color: '#90733B' }}>
            Target Baseline
          </Text>
        </View>
      </View>
    </View>
  );
}

function InsightCard({
  insight,
  surface,
  outline,
  onSurface,
}: {
  insight: BehaviorInsight;
  surface: string;
  outline: string;
  onSurface: string;
}) {
  const tone = TONE_COLORS[insight.tone];
  return (
    <View style={[styles.insightCard, { backgroundColor: surface, borderColor: outline }]}>
      <View style={[styles.insightIconWrap, { backgroundColor: tone.bg }]}>
        <Ionicons name={INSIGHT_ICONS[insight.type]} size={19} color={tone.text} />
      </View>
      <Text style={[styles.insightText, { color: onSurface }]}>{insight.text}</Text>
    </View>
  );
}

function ProductLeaderboardRow({
  product,
  rank,
  maxQty,
  onSurface,
  onSurfaceVariant,
  outlineVariant,
  primary,
  isLast,
  onPress,
}: {
  product: ProductRankingEntry;
  rank: number;
  maxQty: number;
  onSurface: string;
  onSurfaceVariant: string;
  outlineVariant: string;
  primary: string;
  isLast: boolean;
  onPress: () => void;
}) {
  const rankStyle = RANK_STYLES[rank] ?? { bg: '#f1f5f9', text: onSurfaceVariant };
  const fillRatio = maxQty > 0 ? (product.qtySold / maxQty) * 100 : 0;

  return (
    <>
      <TouchableOpacity
        style={styles.leaderboardRow}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={[styles.rankBadge, { backgroundColor: rankStyle.bg }]}>
          <Text style={[styles.rankBadgeText, { color: rankStyle.text }]}>{rank + 1}</Text>
        </View>
        <View style={styles.leaderboardBody}>
          <Text style={[styles.leaderboardName, { color: onSurface }]} numberOfLines={1}>
            {product.productName}
          </Text>
          <View style={[styles.leaderboardTrack, { backgroundColor: outlineVariant }]}>
            <View style={[styles.leaderboardFill, { width: `${fillRatio}%`, backgroundColor: primary }]} />
          </View>
          <Text style={[styles.leaderboardMeta, { color: onSurfaceVariant }]}>
            ≈ {formatCurrency(product.estimatedRevenue)} estimated revenue · tap for details
          </Text>
        </View>
        <Text style={[styles.leaderboardValue, { color: primary }]}>{product.qtySold}</Text>
      </TouchableOpacity>
      {!isLast ? <View style={[styles.rowDivider, { backgroundColor: outlineVariant }]} /> : null}
    </>
  );
}

function SlowProductRow({
  product,
  onSurface,
  outlineVariant,
  isLast,
  onPress,
}: {
  product: ProductRankingEntry;
  onSurface: string;
  outlineVariant: string;
  isLast: boolean;
  onPress: () => void;
}) {
  const noSales = product.qtySold === 0;
  return (
    <>
      <TouchableOpacity
        style={styles.leaderboardRow}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={[styles.rankBadge, { backgroundColor: noSales ? '#fee2e2' : '#fef3c7' }]}>
          <Ionicons name="trending-down-outline" size={15} color={noSales ? '#b91c1c' : '#b45309'} />
        </View>
        <View style={styles.leaderboardBody}>
          <Text style={[styles.leaderboardName, { color: onSurface }]} numberOfLines={1}>
            {product.productName}
          </Text>
          <View
            style={[
              styles.tag,
              { backgroundColor: noSales ? '#fee2e2' : '#fef3c7' },
            ]}
          >
            <Text style={[styles.tagText, { color: noSales ? '#b91c1c' : '#b45309' }]}>
              {noSales ? 'No sales in period' : `Only ${product.qtySold} sold`} · tap for details
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      {!isLast ? <View style={[styles.rowDivider, { backgroundColor: outlineVariant }]} /> : null}
    </>
  );
}

export default function CustomerBehaviorSection() {
  const { paperTheme, resolvedTheme } = useTheme();

  const [data, setData] = useState<CustomerBehaviorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(180);

  // Modals for popups
  const [selectedHour, setSelectedHour] = useState<HourBucket | null>(null);
  const [showWeekendModal, setShowWeekendModal] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<{ product: ProductRankingEntry; rank?: number; isTop: boolean } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null);
  const [showTrendModal, setShowTrendModal] = useState<boolean>(false);
  const [selectedTrendPoint, setSelectedTrendPoint] = useState<TrendPoint | null>(null);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printOptions, setPrintOptions] = useState<ReportPrintOptions>({
    includeKpis: true,
    includeInsights: true,
    includeHourly: true,
    includeWeekendWeekday: true,
    includeProducts: true,
    includeUpcoming: true,
    includeSegments: true,
    includeTrend: true,
    includeStrategies: true,
  });

  const load = useCallback(async (days: number, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      const result = await fetchCustomerBehaviorInsights(days);
      setData(result);
      setSelectedTrendPoint(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not load customer behavior insights. Please try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(selectedDays, true);
  }, [load, selectedDays]);

  const handleDateFilterSelect = (days: number) => {
    if (days === selectedDays || refreshing) return;
    setSelectedDays(days);
  };

  const handlePrintA4 = () => {
    setShowPrintModal(true);
  };

  const [isProcessingPrint, setIsProcessingPrint] = useState(false);

  const executePrintA4 = () => {
    if (!data || isProcessingPrint) return;
    setIsProcessingPrint(true);
    setShowPrintModal(false);
    setTimeout(async () => {
      try {
        await printCustomerBehaviorA4Report(data, undefined, printOptions);
      } catch (err: unknown) {
        console.warn('executePrintA4 error:', err);
      } finally {
        setIsProcessingPrint(false);
      }
    }, 350);
  };

  const executeSharePdf = () => {
    if (!data || isProcessingPrint) return;
    setIsProcessingPrint(true);
    setShowPrintModal(false);
    setTimeout(async () => {
      try {
        await shareCustomerBehaviorPdfReport(data, undefined, printOptions);
      } catch (err: unknown) {
        console.warn('executeSharePdf error:', err);
      } finally {
        setIsProcessingPrint(false);
      }
    }, 350);
  };

  const togglePrintOption = (key: keyof ReportPrintOptions) => {
    setPrintOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setAllPrintOptions = (value: boolean) => {
    setPrintOptions({
      includeKpis: value,
      includeInsights: value,
      includeHourly: value,
      includeWeekendWeekday: value,
      includeProducts: value,
      includeUpcoming: value,
      includeSegments: value,
      includeTrend: value,
      includeStrategies: value,
    });
  };

  const surface = paperTheme.colors.surface;
  const outline = paperTheme.colors.outlineVariant;
  const onSurface = paperTheme.colors.onSurface;
  const onSurfaceVariant = paperTheme.colors.onSurfaceVariant;
  const primary = paperTheme.colors.primary;

  const hours = data?.hourlyPattern?.hours ?? [];
  const peakHour = data?.hourlyPattern?.peakHour ?? null;
  const hourMax = useMemo(
    () => (hours.length ? Math.max(...hours.map((h) => h.avgSales), 1) : 1),
    [hours],
  );

  const weekendVsWeekday = data?.dailyPattern?.weekendVsWeekday ?? null;
  const topProducts = data?.productRankings?.topProducts ?? [];
  const slowProducts = data?.productRankings?.slowProducts ?? [];
  const salesTrend = data?.salesTrend ?? null;
  const maxTopQty = topProducts.length ? Math.max(...topProducts.map((p) => p.qtySold)) : 0;
  const segments = data?.customerSegments?.segments ?? [];

  const pieData = useMemo(
    () =>
      segments.map((segment) => ({
        name: segment.label,
        population: Math.max(segment.revenueSharePercent, 0.5),
        color: SEGMENT_COLORS[segment.label] ?? DEFAULT_SEGMENT_COLOR,
        legendFontColor: onSurfaceVariant,
        legendFontSize: 12,
      })),
    [segments, onSurfaceVariant],
  );

  const renderSectionHeader = (
    icon: keyof typeof Ionicons.glyphMap,
    tint: string,
    title: string,
    subtitle?: string,
    showFilterBtn: boolean = true,
  ) => {
    const activeFilter = DATE_FILTERS.find((f) => f.days === selectedDays);
    return (
      <>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIconWrap, { backgroundColor: `${tint}1f` }]}>
              <Ionicons name={icon} size={18} color={tint} />
            </View>
            <Text style={[styles.sectionTitle, { color: onSurface }]}>{title}</Text>
          </View>

          {showFilterBtn ? (
            <TouchableOpacity
              style={[
                styles.topicFilterBtn,
                { backgroundColor: `${primary}14`, borderColor: `${primary}33` },
              ]}
              activeOpacity={0.75}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="funnel-outline" size={12} color={primary} />
              <Text style={[styles.topicFilterBtnText, { color: primary }]}>
                {activeFilter?.label ?? `${selectedDays}D`}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: onSurfaceVariant }]}>{subtitle}</Text>
        ) : null}
      </>
    );
  };

  const renderDateFilterBar = () => (
    <View style={styles.dateFilterContainer}>
      <View style={styles.topControlsRow}>
        <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 13, color: onSurface }}>
          Time Filter
        </Text>
        <TouchableOpacity
          style={[styles.topicFilterBtn, { backgroundColor: `${primary}14`, borderColor: `${primary}33` }]}
          activeOpacity={0.85}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="funnel-outline" size={12} color={primary} />
          <Text style={[styles.topicFilterBtnText, { color: primary }]}>
            {DATE_FILTERS.find((f) => f.days === selectedDays)?.label ?? `${selectedDays}D`} ({selectedDays} {selectedDays === 1 ? 'Day' : 'Days'})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateFilterRow}
      >
        {DATE_FILTERS.map((filter) => {
          const isActive = selectedDays === filter.days;
          return (
            <TouchableOpacity
              key={filter.label}
              activeOpacity={0.8}
              onPress={() => handleDateFilterSelect(filter.days)}
              style={[
                styles.dateChip,
                {
                  backgroundColor: isActive ? primary : surface,
                  borderColor: isActive ? primary : outline,
                },
              ]}
            >
              <Text
                style={[
                  styles.dateChipText,
                  { color: isActive ? '#ffffff' : onSurfaceVariant },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderExportFooterCard = () => (
    <View style={[styles.exportFooterCard, { backgroundColor: surface, borderColor: outline }]}>
      <View style={styles.exportFooterHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: `${primary}1f` }]}>
          <Ionicons name="document-text" size={18} color={primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.exportFooterTitle, { color: onSurface }]}>
            Export Customer Behavior Report
          </Text>
          <Text style={[styles.exportFooterSubtitle, { color: onSurfaceVariant, marginBottom: 0 }]}>
            Customizable A4 report with your selected visual charts & analytics
          </Text>
        </View>
      </View>
      <View style={{ marginTop: 12 }}>
        <TouchableOpacity
          style={[styles.printPrimaryActionBtn, { backgroundColor: primary }]}
          activeOpacity={0.85}
          onPress={handlePrintA4}
        >
          <Ionicons name="print-outline" size={16} color="#ffffff" />
          <Text style={styles.printPrimaryActionBtnText}>Print Report (A4)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: surface, borderColor: outline }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={[styles.loadingText, { color: onSurfaceVariant }]}>
            Analysing your sales and customer history…
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
            onPress={() => void load(selectedDays, true)}
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

  return (
    <>
      {/* 1. Date range filter bar */}
      {renderDateFilterBar()}

      {data.dataQuality.level !== 'good' ? (
        <View style={[styles.noticeCard, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
          <Ionicons name="information-circle-outline" size={18} color="#b45309" />
          <Text style={[styles.noticeText, { color: '#92400e' }]}>{data.dataQuality.message}</Text>
        </View>
      ) : null}

      {refreshing ? (
        <View style={[styles.card, { backgroundColor: surface, borderColor: outline, paddingVertical: 40 }]}>
          <ActivityIndicator size="small" color={primary} />
        </View>
      ) : (
        <>
          {/* Key Insights */}
          {data.insights.length ? (
            <>
              {renderSectionHeader(
                'bulb-outline',
                primary,
                'Key insights',
                'What your sales and customer data show, in plain language.',
              )}
              <View style={styles.insightStack}>
                {data.insights.map((insight) => (
                  <InsightCard
                    key={insight.type + insight.text}
                    insight={insight}
                    surface={surface}
                    outline={outline}
                    onSurface={onSurface}
                  />
                ))}
              </View>
            </>
          ) : null}

          {/* Busiest Hours Chart */}
          {hours.some((hour) => hour.orderCount > 0) ? (
            <>
              {renderSectionHeader('time-outline', '#2563eb', 'Busiest hours', 'Tap any hour bar to inspect sales, orders & averages')}
              <View style={[styles.card, { backgroundColor: surface, borderColor: outline }]}>
                {peakHour ? (
                  <View style={styles.peakBadgeRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setSelectedHour(peakHour)}
                      style={[styles.peakBadge, { backgroundColor: `${primary}1a` }]}
                    >
                      <Ionicons name="flash" size={13} color={primary} />
                      <Text style={[styles.peakBadgeText, { color: primary }]}>
                        Peak {peakHour.label} · +{Math.max(peakHour?.upliftPercent ?? 0, 0)}%
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ fontFamily: 'Poppins-Regular', fontSize: 11, color: onSurfaceVariant }}>
                      Tap bars to inspect
                    </Text>
                  </View>
                ) : null}

                {/* Active / Inspected Hour Summary Card */}
                {(() => {
                  const displayHour = selectedHour || peakHour || hours.find((h) => h.orderCount > 0) || hours[12];
                  if (!displayHour) return null;
                  const isPeak = peakHour?.hour === displayHour.hour;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setSelectedHour(displayHour)}
                      style={[
                        styles.activeHourCard,
                        {
                          backgroundColor: isPeak ? `${primary}12` : `${onSurfaceVariant}0a`,
                          borderColor: isPeak ? `${primary}44` : outline,
                        },
                      ]}
                    >
                      <View style={styles.activeHourLeft}>
                        <View style={[styles.activeHourIconWrap, { backgroundColor: isPeak ? primary : onSurfaceVariant }]}>
                          <Ionicons name="time" size={18} color="#ffffff" />
                        </View>
                        <View>
                          <Text style={[styles.activeHourTitle, { color: onSurface }]}>
                            {displayHour.label || `Hour ${displayHour.hour}:00`} {isPeak ? '🔥 (Peak)' : ''}
                          </Text>
                          <Text style={[styles.activeHourSub, { color: onSurfaceVariant }]}>
                            {displayHour.orderCount} order{displayHour.orderCount === 1 ? '' : 's'} · Avg {formatCurrency(displayHour.avgSales)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.activeHourStats}>
                        <Text style={[styles.activeHourRevenue, { color: isPeak ? primary : onSurface }]}>
                          {formatCurrency(displayHour.totalSales)}
                        </Text>
                        <Text style={[styles.activeHourOrders, { color: primary }]}>
                          Tap for details →
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })()}

                {/* 24-Hour Bar Strip */}
                <View style={styles.barRow}>
                  {hours.map((hour) => {
                    const isPeak = peakHour?.hour === hour.hour;
                    const isSelected = selectedHour?.hour === hour.hour;
                    const ratio = hour.orderCount > 0 ? Math.max((hour.avgSales / hourMax) * 100, 6) : 3;
                    return (
                      <TouchableOpacity
                        key={hour.hour}
                        style={styles.barWrap}
                        activeOpacity={0.6}
                        onPress={() => setSelectedHour(hour)}
                      >
                        <View
                          style={[
                            styles.bar,
                            isSelected && styles.barSelected,
                            {
                              height: `${ratio}%`,
                              backgroundColor:
                                hour.orderCount === 0
                                  ? outline
                                  : isSelected
                                    ? '#f97316'
                                    : isPeak
                                      ? primary
                                      : `${primary}55`,
                            },
                          ]}
                        />
                        {hour.hour % 3 === 0 ? (
                          <Text
                            style={[
                              styles.barLabel,
                              {
                                color: isSelected || isPeak ? primary : onSurfaceVariant,
                                fontWeight: isSelected || isPeak ? 'bold' : 'normal',
                              },
                            ]}
                          >
                            {hour.hour}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          ) : null}

          {/* Weekend vs Weekday Chart */}
          {weekendVsWeekday ? (
            <>
              {renderSectionHeader('calendar-outline', '#7c3aed', 'Weekend vs weekday', 'Tap card to view detailed breakdown')}
              <TouchableOpacity
                style={[styles.card, { backgroundColor: surface, borderColor: outline }]}
                activeOpacity={0.8}
                onPress={() => setShowWeekendModal(true)}
              >
                <View style={styles.splitBarLabelsRow}>
                  <View>
                    <Text style={[styles.splitBarSideLabel, { color: onSurfaceVariant }]}>WEEKDAY</Text>
                    <Text style={[styles.splitBarValue, { color: onSurface }]}>
                      {formatCurrency(weekendVsWeekday.weekdayAvg)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.splitBarSideLabel, { color: '#7c3aed' }]}>WEEKEND</Text>
                    <Text style={[styles.splitBarValue, { color: '#7c3aed' }]}>
                      {formatCurrency(weekendVsWeekday.weekendAvg)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.splitBarTrack, { backgroundColor: outline }]}>
                  <View
                    style={[
                      styles.splitBarSegment,
                      {
                        flex: Math.max(weekendVsWeekday.weekdayAvg, 1),
                        backgroundColor: onSurfaceVariant,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.splitBarSegment,
                      { flex: Math.max(weekendVsWeekday.weekendAvg, 1), backgroundColor: '#7c3aed' },
                    ]}
                  />
                </View>
                <Text style={[styles.splitBarCaption, { color: onSurfaceVariant }]}>
                  {weekendVsWeekday.higher === 'weekend' ? 'Weekend' : 'Weekday'} sales average{' '}
                  {weekendVsWeekday.diffPercent}% higher. (Tap for details)
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          {/* Top Products */}
          {topProducts.length ? (
            <>
              {renderSectionHeader('trending-up-outline', '#16a34a', 'Top-selling products', 'Tap any product for sales details')}
              <View style={[styles.card, { backgroundColor: surface, borderColor: outline }]}>
                {topProducts.map((product, index) => (
                  <ProductLeaderboardRow
                    key={product.productId ?? product.productName}
                    product={product}
                    rank={index}
                    maxQty={maxTopQty}
                    onSurface={onSurface}
                    onSurfaceVariant={onSurfaceVariant}
                    outlineVariant={outline}
                    primary={primary}
                    isLast={index === topProducts.length - 1}
                    onPress={() => setSelectedProduct({ product, rank: index + 1, isTop: true })}
                  />
                ))}
              </View>
            </>
          ) : null}

          {/* Slow Products */}
          {slowProducts.length ? (
            <>
              {renderSectionHeader('trending-down-outline', '#b45309', 'Slow-moving products', 'Tap any product for insights')}
              <View style={[styles.card, { backgroundColor: surface, borderColor: outline }]}>
                {slowProducts.map((product, index) => (
                  <SlowProductRow
                    key={product.productId ?? product.productName}
                    product={product}
                    onSurface={onSurface}
                    outlineVariant={outline}
                    isLast={index === slowProducts.length - 1}
                    onPress={() => setSelectedProduct({ product, isTop: false })}
                  />
                ))}
              </View>
            </>
          ) : null}

          {/* Customer Segments Chart */}
          {segments.length ? (
            <>
              {renderSectionHeader(
                'people-outline',
                '#0ea5e9',
                'Customer segments',
                'Tap any segment to view RFM profile & recommendations',
              )}
              <View style={[styles.card, { backgroundColor: surface, borderColor: outline }]}>
                <View style={styles.engineBadgeRow}>
                  <View style={[styles.engineBadge, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="logo-python" size={13} color="#15803d" />
                    <Text style={[styles.engineBadgeText, { color: '#15803d' }]}>
                      Python · scikit-learn
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.pieRow}
                  activeOpacity={0.8}
                  onPress={() => setSelectedSegment(segments[0])}
                >
                  <PieChart
                    data={pieData}
                    width={Dimensions.get('window').width - 96}
                    height={170}
                    chartConfig={{
                      backgroundGradientFrom: surface,
                      backgroundGradientTo: surface,
                      color: () => onSurfaceVariant,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    hasLegend={false}
                  />
                </TouchableOpacity>
                {segments.map((segment, index) => {
                  const color = SEGMENT_COLORS[segment.label] ?? DEFAULT_SEGMENT_COLOR;
                  return (
                    <React.Fragment key={segment.key}>
                      <TouchableOpacity
                        style={styles.legendRow}
                        activeOpacity={0.7}
                        onPress={() => setSelectedSegment(segment)}
                      >
                        <View style={[styles.legendDot, { backgroundColor: color }]} />
                        <View style={styles.legendBody}>
                          <Text style={[styles.legendLabel, { color: onSurface }]} numberOfLines={1}>
                            {segment.label}
                          </Text>
                          <Text style={[styles.legendMeta, { color: onSurfaceVariant }]} numberOfLines={1}>
                            {segment.size} customers · avg {formatCurrency(segment.avgMonetary)} · tap for details
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.legendValue, { color }]}>{segment.revenueSharePercent}%</Text>
                          <Text style={[styles.legendValueLabel, { color: onSurfaceVariant }]}>of revenue</Text>
                        </View>
                      </TouchableOpacity>
                      {index < segments.length - 1 ? (
                        <View style={[styles.rowDivider, { backgroundColor: outline }]} />
                      ) : null}
                    </React.Fragment>
                  );
                })}
                <View style={[styles.methodPill, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                  <Text style={[styles.methodPillText, { color: primary }]}>RFM + k-means segmentation</Text>
                </View>
              </View>
            </>
          ) : null}

          {/* Sales Trend Chart */}
          {salesTrend && (salesTrend.points ?? []).length > 0 ? (
            <>
              {renderSectionHeader(
                'analytics-outline',
                '#0284c7',
                'Sales trend & revenue trajectory',
                'Linear regression trajectory across periods (Tap to inspect points)',
              )}
              <TouchableOpacity
                style={[styles.trendCard, { backgroundColor: surface, borderColor: outline }]}
                activeOpacity={0.85}
                onPress={() => setShowTrendModal(true)}
              >
                <View style={styles.trendHeaderRow}>
                  <View
                    style={[
                      styles.trendBadge,
                      {
                        backgroundColor:
                          salesTrend.direction === 'increasing'
                            ? '#dcfce7'
                            : salesTrend.direction === 'decreasing'
                              ? '#fee2e2'
                              : '#eff6ff',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        salesTrend.direction === 'increasing'
                          ? 'trending-up'
                          : salesTrend.direction === 'decreasing'
                            ? 'trending-down'
                            : 'remove-outline'
                      }
                      size={15}
                      color={
                        salesTrend.direction === 'increasing'
                          ? '#16a34a'
                          : salesTrend.direction === 'decreasing'
                            ? '#ef4444'
                            : '#0284c7'
                      }
                    />
                    <Text
                      style={[
                        styles.trendBadgeText,
                        {
                          color:
                            salesTrend.direction === 'increasing'
                              ? '#166534'
                              : salesTrend.direction === 'decreasing'
                                ? '#991b1b'
                                : '#0369a1',
                        },
                      ]}
                    >
                      {salesTrend.direction === 'increasing'
                        ? `+${salesTrend.monthlyChangePercent}% Growth Pace`
                        : salesTrend.direction === 'decreasing'
                          ? `${salesTrend.monthlyChangePercent}% Contraction`
                          : 'Stable Revenue Baseline'}
                    </Text>
                  </View>
                  <Text style={[styles.trendMethodText, { color: onSurfaceVariant }]}>
                    {salesTrend.monthsAnalyzed} periods analyzed
                  </Text>
                </View>

                {/* Visual Trajectory Chart (Bars, Target Line, Rolling Average Curve) */}
                <SalesTrajectoryChart
                  trend={salesTrend}
                  selectedPoint={selectedTrendPoint}
                  onSelectPoint={(point) => setSelectedTrendPoint(point)}
                  onSurface={onSurface}
                  onSurfaceVariant={onSurfaceVariant}
                  outline={outline}
                  primary={primary}
                />

                {/* Selected Point Inspection Box */}
                {selectedTrendPoint ? (
                  <View style={[styles.trendInspectionCard, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
                    <View>
                      <Text style={[styles.trendInspectionValue, { color: '#0369a1' }]}>
                        {selectedTrendPoint.label}: {formatCurrency(selectedTrendPoint.sales)}
                      </Text>
                      <Text style={[styles.trendInspectionSub, { color: '#0284c7' }]}>
                        {selectedTrendPoint.orders} completed order(s)
                      </Text>
                    </View>
                    <Ionicons name="stats-chart" size={16} color="#0284c7" />
                  </View>
                ) : (
                  <View style={[styles.trendInspectionCard, { backgroundColor: `${onSurfaceVariant}0a`, borderColor: outline }]}>
                    <Text style={[styles.trendInspectionSub, { color: onSurfaceVariant }]}>
                      Tap any period bar to inspect detailed sales & orders
                    </Text>
                    <Ionicons name="hand-left-outline" size={14} color={onSurfaceVariant} />
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          {/* Export and Print Report Footer Card */}
          {renderExportFooterCard()}
        </>
      )}

      <Text style={[styles.footNote, { color: paperTheme.colors.outline }]}>
        Generated {new Date(data.generatedAt).toLocaleString('en-LK')} · period: last{' '}
        {data.lookbackDays} days
      </Text>

      {/* ----------------- MODAL POPUPS ----------------- */}

      {/* 1. Hour Detail Modal */}
      <Modal
        visible={selectedHour !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedHour(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedHour(null)}
        >
          <TouchableOpacity
            style={[styles.modalCard, { backgroundColor: surface, borderColor: outline }]}
            activeOpacity={1}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, { backgroundColor: `${primary}1f` }]}>
                  <Ionicons name="time" size={22} color={primary} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: onSurface }]}>
                    {selectedHour?.label || `Hour ${selectedHour?.hour}:00`}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: onSurfaceVariant }]}>
                    Hourly sales breakdown
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: outline }]}
                onPress={() => setSelectedHour(null)}
              >
                <Ionicons name="close" size={18} color={onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalStatsGrid}>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Total Sales</Text>
                <Text style={[styles.modalStatValue, { color: primary }]}>
                  {formatCurrency(selectedHour?.totalSales ?? 0)}
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Total Orders</Text>
                <Text style={[styles.modalStatValue, { color: onSurface }]}>
                  {selectedHour?.orderCount ?? 0} orders
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Avg Order Size</Text>
                <Text style={[styles.modalStatValue, { color: onSurface }]}>
                  {formatCurrency(selectedHour?.avgSales ?? 0)}
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Status</Text>
                <Text style={[styles.modalStatValue, { color: peakHour?.hour === selectedHour?.hour ? '#16a34a' : onSurfaceVariant }]}>
                  {peakHour?.hour === selectedHour?.hour ? '🔥 Peak Hour' : selectedHour && selectedHour.orderCount > 0 ? 'Active' : 'Quiet'}
                </Text>
              </View>
            </View>

            {peakHour && selectedHour && peakHour.hour === selectedHour.hour ? (
              <View style={[styles.modalTipCard, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="flash" size={16} color="#15803d" />
                <Text style={[styles.modalTipText, { color: '#15803d' }]}>
                  This is your busiest hour! Sales are +{Math.max(peakHour.upliftPercent ?? 0, 0)}% higher than average. Ensure adequate staff during this window.
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: primary }]}
              onPress={() => setSelectedHour(null)}
            >
              <Text style={[styles.modalDoneBtnText, { color: '#ffffff' }]}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 2. Weekend vs Weekday Detail Modal */}
      <Modal
        visible={showWeekendModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeekendModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWeekendModal(false)}
        >
          <TouchableOpacity
            style={[styles.modalCard, { backgroundColor: surface, borderColor: outline }]}
            activeOpacity={1}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, { backgroundColor: '#7c3aed1f' }]}>
                  <Ionicons name="calendar" size={22} color="#7c3aed" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: onSurface }]}>
                    Weekend vs Weekday
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: onSurfaceVariant }]}>
                    Revenue comparison
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: outline }]}
                onPress={() => setShowWeekendModal(false)}
              >
                <Ionicons name="close" size={18} color={onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalStatsGrid}>
              <View style={[styles.modalStatBox, { backgroundColor: `${onSurfaceVariant}0f`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Weekday Avg (Mon-Fri)</Text>
                <Text style={[styles.modalStatValue, { color: onSurface }]}>
                  {formatCurrency(weekendVsWeekday?.weekdayAvg ?? 0)}
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: '#7c3aed15', borderColor: '#7c3aed33' }]}>
                <Text style={[styles.modalStatLabel, { color: '#7c3aed' }]}>Weekend Avg (Sat-Sun)</Text>
                <Text style={[styles.modalStatValue, { color: '#7c3aed' }]}>
                  {formatCurrency(weekendVsWeekday?.weekendAvg ?? 0)}
                </Text>
              </View>
            </View>

            <View style={[styles.modalTipCard, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="stats-chart" size={16} color="#6d28d9" />
              <Text style={[styles.modalTipText, { color: '#6d28d9' }]}>
                {weekendVsWeekday?.higher === 'weekend'
                  ? `Weekend sales outpace weekdays by ${weekendVsWeekday?.diffPercent}%. Stock up inventory before Friday!`
                  : `Weekday sales are higher by ${weekendVsWeekday?.diffPercent}%. Focus weekday lunch/working hours.`}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: '#7c3aed' }]}
              onPress={() => setShowWeekendModal(false)}
            >
              <Text style={[styles.modalDoneBtnText, { color: '#ffffff' }]}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 3. Product Detail Modal */}
      <Modal
        visible={selectedProduct !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedProduct(null)}
        >
          <TouchableOpacity
            style={[styles.modalCard, { backgroundColor: surface, borderColor: outline }]}
            activeOpacity={1}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalIconWrap,
                    { backgroundColor: selectedProduct?.isTop ? '#16a34a1f' : '#b453091f' },
                  ]}
                >
                  <Ionicons
                    name={selectedProduct?.isTop ? 'trending-up' : 'trending-down'}
                    size={22}
                    color={selectedProduct?.isTop ? '#16a34a' : '#b45309'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: onSurface }]} numberOfLines={1}>
                    {selectedProduct?.product.productName}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: onSurfaceVariant }]}>
                    {selectedProduct?.isTop ? `Top Seller #${selectedProduct?.rank}` : 'Slow-Moving Item'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: outline }]}
                onPress={() => setSelectedProduct(null)}
              >
                <Ionicons name="close" size={18} color={onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalStatsGrid}>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Quantity Sold</Text>
                <Text style={[styles.modalStatValue, { color: primary }]}>
                  {selectedProduct?.product.qtySold ?? 0} units
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Estimated Revenue</Text>
                <Text style={[styles.modalStatValue, { color: onSurface }]}>
                  {formatCurrency(selectedProduct?.product.estimatedRevenue ?? 0)}
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Order Frequency</Text>
                <Text style={[styles.modalStatValue, { color: onSurface }]}>
                  {selectedProduct?.product.orderCount ?? 0} orders
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Time Period</Text>
                <Text style={[styles.modalStatValue, { color: onSurfaceVariant }]}>
                  Last {selectedDays} Days
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.modalTipCard,
                { backgroundColor: selectedProduct?.isTop ? '#dcfce7' : '#fef3c7' },
              ]}
            >
              <Ionicons
                name="bulb"
                size={16}
                color={selectedProduct?.isTop ? '#15803d' : '#b45309'}
              />
              <Text
                style={[
                  styles.modalTipText,
                  { color: selectedProduct?.isTop ? '#15803d' : '#b45309' },
                ]}
              >
                {selectedProduct?.isTop
                  ? `Maintain sufficient stock of ${selectedProduct.product.productName}. Consider bundle deals with slow items!`
                  : selectedProduct?.product.qtySold === 0
                    ? `No sales recorded in the last ${selectedDays} days. Consider price discounts or promotional visibility.`
                    : `Low movement detected. Pair with best-sellers in combo packages.`}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.modalDoneBtn,
                { backgroundColor: selectedProduct?.isTop ? '#16a34a' : '#b45309' },
              ]}
              onPress={() => setSelectedProduct(null)}
            >
              <Text style={[styles.modalDoneBtnText, { color: '#ffffff' }]}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 4. Customer Segment Detail Modal */}
      <Modal
        visible={selectedSegment !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSegment(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedSegment(null)}
        >
          <TouchableOpacity
            style={[styles.modalCard, { backgroundColor: surface, borderColor: outline }]}
            activeOpacity={1}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalIconWrap,
                    {
                      backgroundColor: `${SEGMENT_COLORS[selectedSegment?.label ?? ''] ?? DEFAULT_SEGMENT_COLOR
                        }1f`,
                    },
                  ]}
                >
                  <Ionicons
                    name="people"
                    size={22}
                    color={SEGMENT_COLORS[selectedSegment?.label ?? ''] ?? DEFAULT_SEGMENT_COLOR}
                  />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: onSurface }]}>
                    {selectedSegment?.label}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: onSurfaceVariant }]}>
                    RFM Customer Cluster
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: outline }]}
                onPress={() => setSelectedSegment(null)}
              >
                <Ionicons name="close" size={18} color={onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalStatsGrid}>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Customer Count</Text>
                <Text
                  style={[
                    styles.modalStatValue,
                    { color: SEGMENT_COLORS[selectedSegment?.label ?? ''] ?? primary },
                  ]}
                >
                  {selectedSegment?.size} ({selectedSegment?.sharePercent}%)
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Revenue Share</Text>
                <Text style={[styles.modalStatValue, { color: onSurface }]}>
                  {selectedSegment?.revenueSharePercent}% of total
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Avg Monetary Spend</Text>
                <Text style={[styles.modalStatValue, { color: onSurface }]}>
                  {formatCurrency(selectedSegment?.avgMonetary ?? 0)}
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Avg Recency</Text>
                <Text style={[styles.modalStatValue, { color: onSurface }]}>
                  {selectedSegment?.avgRecencyDays} days ago
                </Text>
              </View>
            </View>

            <View style={[styles.modalTipCard, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="information-circle" size={16} color="#0284c7" />
              <Text style={[styles.modalTipText, { color: '#0369a1' }]}>
                {selectedSegment?.label === 'VIP / Loyal'
                  ? 'Your highest value customers! Offer exclusive loyalty perks and VIP discounts.'
                  : selectedSegment?.label === 'Regular'
                    ? 'Consistent buyers. Upsell premium items to convert them to VIP status.'
                    : selectedSegment?.label === 'At risk / Lapsed'
                      ? 'Lapsed customers. Send targeted re-engagement SMS / OTP promotions to bring them back!'
                      : 'Occasional buyers. Encourage repeat visits with limited-time seasonal offers.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.modalDoneBtn,
                {
                  backgroundColor:
                    SEGMENT_COLORS[selectedSegment?.label ?? ''] ?? primary,
                },
              ]}
              onPress={() => setSelectedSegment(null)}
            >
              <Text style={[styles.modalDoneBtnText, { color: '#ffffff' }]}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 5. Sales Trend Detail Modal */}
      <Modal
        visible={showTrendModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTrendModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTrendModal(false)}
        >
          <TouchableOpacity
            style={[styles.modalCard, { backgroundColor: surface, borderColor: outline }]}
            activeOpacity={1}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, { backgroundColor: '#e0f2fe' }]}>
                  <Ionicons name="analytics" size={22} color="#0284c7" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: onSurface }]}>
                    Sales Trend Trajectory
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: onSurfaceVariant }]}>
                    Linear regression trajectory breakdown
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: outline }]}
                onPress={() => setShowTrendModal(false)}
              >
                <Ionicons name="close" size={18} color={onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalStatsGrid}>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Trend Direction</Text>
                <Text
                  style={[
                    styles.modalStatValue,
                    {
                      color:
                        salesTrend?.direction === 'increasing'
                          ? '#16a34a'
                          : salesTrend?.direction === 'decreasing'
                            ? '#dc2626'
                            : '#0284c7',
                    },
                  ]}
                >
                  {salesTrend?.direction === 'increasing'
                    ? 'Growing'
                    : salesTrend?.direction === 'decreasing'
                      ? 'Declining'
                      : 'Stable'}
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Growth Pace</Text>
                <Text style={[styles.modalStatValue, { color: onSurface }]}>
                  {salesTrend?.monthlyChangePercent && salesTrend.monthlyChangePercent > 0
                    ? `+${salesTrend.monthlyChangePercent}%`
                    : `${salesTrend?.monthlyChangePercent ?? 0}%`}
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Periods Tracked</Text>
                <Text style={[styles.modalStatValue, { color: onSurface }]}>
                  {salesTrend?.monthsAnalyzed ?? 0} periods
                </Text>
              </View>
              <View style={[styles.modalStatBox, { backgroundColor: `${primary}0d`, borderColor: outline }]}>
                <Text style={[styles.modalStatLabel, { color: onSurfaceVariant }]}>Method</Text>
                <Text style={[styles.modalStatValue, { color: onSurface }]}>
                  OLS Regression
                </Text>
              </View>
            </View>

            <View style={[styles.modalTipCard, { backgroundColor: '#f0f9ff' }]}>
              <Ionicons name="bulb" size={16} color="#0284c7" />
              <Text style={[styles.modalTipText, { color: '#0369a1' }]}>
                {salesTrend?.direction === 'increasing'
                  ? 'Revenue momentum is strong! Continue scaling top-selling products and maintaining customer loyalty.'
                  : salesTrend?.direction === 'decreasing'
                    ? 'Sales volume is showing a slight downward pace. Review menu combos and activate lapsed customer campaigns.'
                    : 'Sales maintain a steady and predictable baseline across time periods.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: '#0284c7' }]}
              onPress={() => setShowTrendModal(false)}
            >
              <Text style={[styles.modalDoneBtnText, { color: '#ffffff' }]}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 6. Timeframe Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowFilterModal(false)}
          />
          <View
            style={[styles.modalCard, { backgroundColor: surface, borderColor: outline }]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, { backgroundColor: `${primary}1f` }]}>
                  <Ionicons name="funnel" size={20} color={primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: onSurface }]}>
                    Select Time Frame
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: onSurfaceVariant }]}>
                    Filter all topics & metrics by date range
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: outline }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Ionicons name="close" size={18} color={onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterOptionStack}>
              {DATE_FILTERS.map((filter) => {
                const isActive = selectedDays === filter.days;
                return (
                  <TouchableOpacity
                    key={filter.label}
                    style={[
                      styles.filterOptionRow,
                      {
                        backgroundColor: isActive ? `${primary}12` : surface,
                        borderColor: isActive ? primary : outline,
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => {
                      handleDateFilterSelect(filter.days);
                      setShowFilterModal(false);
                    }}
                  >
                    <View style={styles.filterOptionLeft}>
                      <View
                        style={[
                          styles.filterOptionRadio,
                          { borderColor: isActive ? primary : outline },
                        ]}
                      >
                        {isActive ? (
                          <View
                            style={[
                              styles.filterOptionRadioInner,
                              { backgroundColor: primary },
                            ]}
                          />
                        ) : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.filterOptionLabel, { color: isActive ? primary : onSurface }]}>
                          {filter.label} ({filter.days} {filter.days === 1 ? 'Day' : 'Days'})
                        </Text>
                        <Text style={[styles.filterOptionSub, { color: onSurfaceVariant }]}>
                          {filter.subtitle}
                        </Text>
                      </View>
                    </View>
                    {isActive ? (
                      <Ionicons name="checkmark-circle" size={18} color={primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: `${primary}1a`, marginTop: 6 }]}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={[styles.modalDoneBtnText, { color: primary, fontFamily: 'Poppins-Bold' }]}>
                Apply & View
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 7. Print & Feature Selection Modal */}
      <Modal
        visible={showPrintModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrintModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowPrintModal(false)}
          />

          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: surface,
                borderColor: outline,
                maxHeight: '88%',
                display: 'flex',
                flexDirection: 'column',
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, { backgroundColor: `${primary}1f` }]}>
                  <Ionicons name="print" size={20} color={primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: onSurface }]}>
                    Customize Print Report
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: onSurfaceVariant }]}>
                    Select time frame & choose features
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: outline }]}
                onPress={() => setShowPrintModal(false)}
              >
                <Ionicons name="close" size={18} color={onSurface} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Body */}
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 14 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Step 1: Select Time Frame */}
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontFamily: 'Poppins-Bold',
                    fontSize: 12,
                    color: onSurface,
                    marginBottom: 6,
                  }}
                >
                  1. Select Time Frame ({selectedDays} Days)
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateFilterRow}
                  nestedScrollEnabled={true}
                >
                  {DATE_FILTERS.map((filter) => {
                    const isActive = selectedDays === filter.days;
                    return (
                      <TouchableOpacity
                        key={filter.label}
                        activeOpacity={0.8}
                        onPress={() => handleDateFilterSelect(filter.days)}
                        style={[
                          styles.dateChip,
                          {
                            backgroundColor: isActive ? primary : surface,
                            borderColor: isActive ? primary : outline,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dateChipText,
                            { color: isActive ? '#ffffff' : onSurfaceVariant },
                          ]}
                        >
                          {filter.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Step 2: Choose Features to Include */}
              <View style={styles.featureHeaderControls}>
                <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 12, color: onSurface }}>
                  2. Features to Include ({Object.values(printOptions).filter(Boolean).length}/9)
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const allSelected = Object.values(printOptions).every(Boolean);
                    setAllPrintOptions(!allSelected);
                  }}
                  style={{ paddingHorizontal: 4 }}
                >
                  <Text style={[styles.featureSelectAllText, { color: primary }]}>
                    {Object.values(printOptions).every(Boolean) ? 'Clear All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.featureOptionStack}>
                {PRINTABLE_FEATURES.map((feat) => {
                  const isChecked = !!printOptions[feat.key];
                  return (
                    <TouchableOpacity
                      key={feat.key}
                      style={[
                        styles.featureOptionRow,
                        {
                          backgroundColor: isChecked ? `${primary}0d` : surface,
                          borderColor: isChecked ? primary : outline,
                        },
                      ]}
                      activeOpacity={0.75}
                      onPress={() => togglePrintOption(feat.key)}
                    >
                      <View style={styles.featureOptionLeft}>
                        <View
                          style={[
                            styles.featureIconWrap,
                            { backgroundColor: `${feat.tint}1f` },
                          ]}
                        >
                          <Ionicons name={feat.icon} size={15} color={feat.tint} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.featureOptionLabel,
                              { color: isChecked ? onSurface : onSurfaceVariant },
                            ]}
                          >
                            {feat.title}
                          </Text>
                          <Text style={[styles.featureOptionSub, { color: onSurfaceVariant }]}>
                            {feat.sub}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.featureCheckbox,
                          {
                            borderColor: isChecked ? primary : outline,
                            backgroundColor: isChecked ? primary : 'transparent',
                          },
                        ]}
                      >
                        {isChecked ? (
                          <Ionicons name="checkmark" size={13} color="#ffffff" />
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Pinned Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: outline }}>
              <TouchableOpacity
                style={[
                  styles.printPrimaryActionBtn,
                  { backgroundColor: primary, paddingVertical: 12 },
                ]}
                activeOpacity={0.85}
                onPress={executePrintA4}
              >
                <Ionicons name="print-outline" size={16} color="#ffffff" />
                <Text style={styles.printPrimaryActionBtnText}>Print A4</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shareSecondaryActionBtn,
                  { backgroundColor: surface, borderColor: outline, paddingVertical: 12 },
                ]}
                activeOpacity={0.85}
                onPress={executeSharePdf}
              >
                <Ionicons name="share-social-outline" size={16} color={primary} />
                <Text style={[styles.shareSecondaryActionBtnText, { color: onSurface }]}>
                  Share PDF
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
