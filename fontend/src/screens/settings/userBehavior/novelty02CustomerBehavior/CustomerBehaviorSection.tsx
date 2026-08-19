import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../../../context/ThemeContext';
import { getApiErrorMessage } from '../../../../utils/apiErrorAlert';
import { fetchCustomerBehaviorInsights } from './behaviorService';
import { behaviorStyles as styles } from './behaviorStyles';
import type {
  BehaviorInsight,
  BehaviorInsightTone,
  BehaviorInsightType,
  CustomerBehaviorData,
  ProductRankingEntry,
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
  { bg: '#fef3c7', text: '#b45309' },
  { bg: '#e2e8f0', text: '#475569' },
  { bg: '#ffedd5', text: '#c2410c' },
];

function formatCurrency(value: number): string {
  return `Rs. ${Math.round(value).toLocaleString('en-LK')}`;
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
}: {
  product: ProductRankingEntry;
  rank: number;
  maxQty: number;
  onSurface: string;
  onSurfaceVariant: string;
  outlineVariant: string;
  primary: string;
  isLast: boolean;
}) {
  const rankStyle = RANK_STYLES[rank] ?? { bg: '#f1f5f9', text: onSurfaceVariant };
  const fillRatio = maxQty > 0 ? (product.qtySold / maxQty) * 100 : 0;

  return (
    <>
      <View style={styles.leaderboardRow}>
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
            ≈ {formatCurrency(product.estimatedRevenue)} estimated revenue
          </Text>
        </View>
        <Text style={[styles.leaderboardValue, { color: primary }]}>{product.qtySold}</Text>
      </View>
      {!isLast ? <View style={[styles.rowDivider, { backgroundColor: outlineVariant }]} /> : null}
    </>
  );
}

function SlowProductRow({
  product,
  onSurface,
  outlineVariant,
  isLast,
}: {
  product: ProductRankingEntry;
  onSurface: string;
  outlineVariant: string;
  isLast: boolean;
}) {
  const noSales = product.qtySold === 0;
  return (
    <>
      <View style={styles.leaderboardRow}>
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
              {noSales ? 'No sales in period' : `Only ${product.qtySold} sold`}
            </Text>
          </View>
        </View>
      </View>
      {!isLast ? <View style={[styles.rowDivider, { backgroundColor: outlineVariant }]} /> : null}
    </>
  );
}

export default function CustomerBehaviorSection() {
  const { paperTheme, resolvedTheme } = useTheme();

  const [data, setData] = useState<CustomerBehaviorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCustomerBehaviorInsights();
      setData(result);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not load customer behavior insights. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
  ) => (
    <>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: `${tint}1f` }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <Text style={[styles.sectionTitle, { color: onSurface }]}>{title}</Text>
      </View>
      {subtitle ? (
        <Text style={[styles.sectionSubtitle, { color: onSurfaceVariant }]}>{subtitle}</Text>
      ) : null}
    </>
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
            onPress={() => void load()}
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
      {data.dataQuality.level !== 'good' ? (
        <View style={[styles.noticeCard, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
          <Ionicons name="information-circle-outline" size={18} color="#b45309" />
          <Text style={[styles.noticeText, { color: '#92400e' }]}>{data.dataQuality.message}</Text>
        </View>
      ) : null}

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

      {hours.some((hour) => hour.orderCount > 0) ? (
        <>
          {renderSectionHeader('time-outline', '#2563eb', 'Busiest hours')}
          <View style={[styles.card, { backgroundColor: surface, borderColor: outline }]}>
            {peakHour ? (
              <View style={styles.peakBadgeRow}>
                <View style={[styles.peakBadge, { backgroundColor: `${primary}1a` }]}>
                  <Ionicons name="flash" size={13} color={primary} />
                  <Text style={[styles.peakBadgeText, { color: primary }]}>
                    Peak {peakHour.label} · +{Math.max(peakHour.upliftPercent, 0)}%
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={styles.barRow}>
              {hours.map((hour) => {
                const isPeak = peakHour?.hour === hour.hour;
                const ratio = hour.orderCount > 0 ? Math.max((hour.avgSales / hourMax) * 100, 4) : 2;
                return (
                  <View key={hour.hour} style={styles.barWrap}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${ratio}%`,
                          backgroundColor:
                            hour.orderCount === 0 ? outline : isPeak ? primary : `${primary}45`,
                        },
                      ]}
                    />
                    {hour.hour % 3 === 0 ? (
                      <Text style={[styles.barLabel, { color: onSurfaceVariant }]}>{hour.hour}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        </>
      ) : null}

      {weekendVsWeekday ? (
        <>
          {renderSectionHeader('calendar-outline', '#7c3aed', 'Weekend vs weekday')}
          <View style={[styles.card, { backgroundColor: surface, borderColor: outline }]}>
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
              {weekendVsWeekday.diffPercent}% higher.
            </Text>
          </View>
        </>
      ) : null}

      {topProducts.length ? (
        <>
          {renderSectionHeader('trending-up-outline', '#16a34a', 'Top-selling products')}
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
              />
            ))}
          </View>
        </>
      ) : null}

      {slowProducts.length ? (
        <>
          {renderSectionHeader('trending-down-outline', '#b45309', 'Slow-moving products')}
          <View style={[styles.card, { backgroundColor: surface, borderColor: outline }]}>
            {slowProducts.map((product, index) => (
              <SlowProductRow
                key={product.productId ?? product.productName}
                product={product}
                onSurface={onSurface}
                outlineVariant={outline}
                isLast={index === slowProducts.length - 1}
              />
            ))}
          </View>
        </>
      ) : null}

      {segments.length ? (
        <>
          {renderSectionHeader(
            'people-outline',
            '#0ea5e9',
            'Customer segments',
            'Customers grouped by recency, frequency and spend (RFM), clustered with k-means.',
          )}
          <View style={[styles.card, { backgroundColor: surface, borderColor: outline }]}>
            <View style={styles.pieRow}>
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
            </View>
            {segments.map((segment, index) => {
              const color = SEGMENT_COLORS[segment.label] ?? DEFAULT_SEGMENT_COLOR;
              return (
                <React.Fragment key={segment.key}>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <View style={styles.legendBody}>
                      <Text style={[styles.legendLabel, { color: onSurface }]} numberOfLines={1}>
                        {segment.label}
                      </Text>
                      <Text style={[styles.legendMeta, { color: onSurfaceVariant }]} numberOfLines={1}>
                        {segment.size} customers · avg {formatCurrency(segment.avgMonetary)}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.legendValue, { color }]}>{segment.revenueSharePercent}%</Text>
                      <Text style={[styles.legendValueLabel, { color: onSurfaceVariant }]}>of revenue</Text>
                    </View>
                  </View>
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

      <Text style={[styles.footNote, { color: paperTheme.colors.outline }]}>
        Generated {new Date(data.generatedAt).toLocaleString('en-LK')} · based on the last{' '}
        {data.lookbackDays} days
      </Text>
    </>
  );
}
