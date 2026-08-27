import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { getApiErrorMessage } from '../../../../utils/apiErrorAlert';
import { fetchRecommendationInsights } from './recommendationsService';
import { recommendationsStyles as styles } from './recommendationsStyles';
import type {
  CategoryAttachRate,
  RecommendationInsightsData,
  RecommendationRule,
} from './recommendationsTypes';

const METHOD_LABELS: Record<string, string> = {
  apriori_rules: 'Apriori association rules',
  item_cf: 'item-to-item collaborative filtering',
  popularity: 'popularity fallback',
};

/** "apriori_rules+item_cf+popularity" reads as machine output; unpack it. */
function describeMethod(method: string | null): string {
  if (!method) return 'Association rule mining';
  const parts = method
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => METHOD_LABELS[part] ?? part.replace(/_/g, ' '));
  if (!parts.length) return 'Association rule mining';
  const label = parts.join(' + ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** Lift is a ratio, so one decimal is enough to tell 2.8x from 2.9x. */
function formatLift(lift: number): string {
  return `${lift.toFixed(1)}x`;
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-LK');
}

function StatTile({
  value,
  label,
  background,
  valueColor,
  labelColor,
}: {
  value: string;
  label: string;
  background: string;
  valueColor: string;
  labelColor: string;
}) {
  return (
    <View style={[styles.statTile, { backgroundColor: background }]}>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

function RuleCard({
  rule,
  surface,
  outline,
  onSurface,
  onSurfaceVariant,
  primary,
}: {
  rule: RecommendationRule;
  surface: string;
  outline: string;
  onSurface: string;
  onSurfaceVariant: string;
  primary: string;
}) {
  const antecedentLabel = rule.antecedent.map((product) => product.productName).join(' + ');

  return (
    <View style={[styles.ruleCard, { backgroundColor: surface, borderColor: outline }]}>
      <View style={styles.ruleSentence}>
        <Text style={[styles.ruleProduct, { color: onSurface }]}>{antecedentLabel}</Text>
        <Ionicons name="arrow-forward" size={14} color={primary} />
        <Text style={[styles.ruleProduct, { color: primary }]}>{rule.consequent.productName}</Text>
      </View>

      <View style={styles.rulePillRow}>
        <View style={[styles.rulePill, { backgroundColor: `${primary}1a` }]}>
          <Text style={[styles.rulePillText, { color: primary }]}>
            {formatPercent(rule.confidence)} of the time
          </Text>
        </View>
        <View style={[styles.rulePill, { backgroundColor: '#dcfce7' }]}>
          <Text style={[styles.rulePillText, { color: '#15803d' }]}>
            {formatLift(rule.lift)} more likely than chance
          </Text>
        </View>
      </View>

      <Text style={[styles.ruleMeta, { color: onSurfaceVariant }]}>
        Bought together in {formatCount(rule.count)} order{rule.count === 1 ? '' : 's'} ·{' '}
        {formatPercent(rule.support)} of all orders
      </Text>
    </View>
  );
}

function CategoryAttachCard({
  entry,
  maxAttachRate,
  surface,
  outline,
  onSurface,
  onSurfaceVariant,
  surfaceVariant,
  primary,
}: {
  entry: CategoryAttachRate;
  maxAttachRate: number;
  surface: string;
  outline: string;
  onSurface: string;
  onSurfaceVariant: string;
  surfaceVariant: string;
  primary: string;
}) {
  // Bars are scaled against the strongest category so the weaker ones stay readable.
  const fillRatio = maxAttachRate > 0 ? (entry.attachRate / maxAttachRate) * 100 : 0;

  return (
    <View style={[styles.attachCard, { backgroundColor: surface, borderColor: outline }]}>
      <View style={styles.attachTopRow}>
        <Text style={[styles.attachName, { color: onSurface }]} numberOfLines={1}>
          {entry.categoryName}
        </Text>
        <Text style={[styles.attachValue, { color: primary }]}>
          {formatPercent(entry.attachRate)}
        </Text>
      </View>

      <Text style={[styles.attachSentence, { color: onSurfaceVariant }]}>
        {entry.categoryName} are added to {formatPercent(entry.attachRate)} of orders
      </Text>

      <View style={[styles.attachTrack, { backgroundColor: surfaceVariant }]}>
        <View style={[styles.attachFill, { width: `${fillRatio}%`, backgroundColor: primary }]} />
      </View>

      {entry.topProducts.length ? (
        <Text style={[styles.attachMeta, { color: onSurfaceVariant }]}>
          Most often: {entry.topProducts.map((product) => product.productName).join(', ')}
        </Text>
      ) : null}
    </View>
  );
}

export default function RecommendationsSection() {
  const { paperTheme } = useTheme();

  const [data, setData] = useState<RecommendationInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRecommendationInsights();
      setData(result);
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err, 'Could not load the recommendation insights. Please try again.'),
      );
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
  const surfaceVariant = paperTheme.colors.surfaceVariant;
  const primary = paperTheme.colors.primary;

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

  const renderEmptyNotice = (message: string) => (
    <View style={[styles.noticeCard, { backgroundColor: surfaceVariant, borderColor: outline }]}>
      <Ionicons name="information-circle-outline" size={18} color={onSurfaceVariant} />
      <Text style={[styles.noticeText, { color: onSurfaceVariant }]}>{message}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: surface, borderColor: outline }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={[styles.loadingText, { color: onSurfaceVariant }]}>
            Mining your order history for buy-together patterns…
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
          {
            backgroundColor: paperTheme.colors.errorContainer,
            borderColor: `${paperTheme.colors.error}33`,
          },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={18} color={paperTheme.colors.error} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.noticeText, { color: paperTheme.colors.onErrorContainer }]}>
            {error}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => void load()}
            style={[styles.retryBtn, { backgroundColor: paperTheme.colors.error }]}
          >
            <Ionicons name="refresh" size={15} color={paperTheme.colors.onError} />
            <Text style={[styles.retryBtnText, { color: paperTheme.colors.onError }]}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!data) return null;

  const { model, rules, categoryAttach } = data;

  // Too little history is a data problem, not a failure — say what is missing.
  if (!model.modelReady) {
    return (
      <View style={[styles.noticeCard, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
        <Ionicons name="information-circle-outline" size={18} color="#b45309" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.noticeTitle, { color: '#92400e' }]}>Still learning</Text>
          <Text style={[styles.noticeText, { color: '#92400e' }]}>
            The recommendation engine needs{' '}
            {model.minimumRequired ? `at least ${model.minimumRequired} ` : 'more '}
            completed orders before it can spot buy-together patterns. So far it has{' '}
            {formatCount(model.stats.transactionCount)}.
          </Text>
        </View>
      </View>
    );
  }

  const maxAttachRate = categoryAttach.length
    ? Math.max(...categoryAttach.map((entry) => entry.attachRate))
    : 0;

  return (
    <>
      <View style={styles.engineBadgeRow}>
        <View style={[styles.engineBadge, { backgroundColor: '#dcfce7' }]}>
          <Ionicons name="logo-python" size={13} color="#15803d" />
          <Text style={[styles.engineBadgeText, { color: '#15803d' }]}>Python · Apriori</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: surface, borderColor: outline }]}>
        <View style={styles.statGrid}>
          <StatTile
            value={formatCount(model.stats.transactionCount)}
            label="Orders learned from"
            background={surfaceVariant}
            valueColor={onSurface}
            labelColor={onSurfaceVariant}
          />
          <StatTile
            value={formatCount(model.stats.itemCount)}
            label="Products in the model"
            background={surfaceVariant}
            valueColor={onSurface}
            labelColor={onSurfaceVariant}
          />
          <StatTile
            value={formatCount(model.stats.ruleCount)}
            label="Buy-together rules"
            background={surfaceVariant}
            valueColor={onSurface}
            labelColor={onSurfaceVariant}
          />
          <StatTile
            value={model.stats.avgBasketSize.toFixed(1)}
            label="Items per order (avg)"
            background={surfaceVariant}
            valueColor={onSurface}
            labelColor={onSurfaceVariant}
          />
        </View>

        <View style={[styles.methodPill, { backgroundColor: `${primary}1a` }]}>
          <Text style={[styles.methodPillText, { color: primary }]}>
            {describeMethod(model.method)}
          </Text>
        </View>
      </View>

      {renderSectionHeader(
        'git-network-outline',
        '#4338ca',
        'Buy-together patterns',
        'When a customer orders the product on the left, this is how often the product on the right joins it.',
      )}

      {rules.length
        ? rules.map((rule) => (
            <RuleCard
              key={`${rule.antecedent.map((product) => product.productId).join('|')}->${
                rule.consequent.productId
              }`}
              rule={rule}
              surface={surface}
              outline={outline}
              onSurface={onSurface}
              onSurfaceVariant={onSurfaceVariant}
              primary={primary}
            />
          ))
        : renderEmptyNotice(
            'No buy-together patterns found yet — once the shop has more varied orders, pairs that sell together will appear here.',
          )}

      {renderSectionHeader(
        'pricetags-outline',
        '#b45309',
        'Category attach rates',
        'How often each category shows up in an order — the categories worth suggesting at checkout.',
      )}

      {categoryAttach.length
        ? categoryAttach.map((entry) => (
            <CategoryAttachCard
              key={entry.categoryId ?? entry.categoryName}
              entry={entry}
              maxAttachRate={maxAttachRate}
              surface={surface}
              outline={outline}
              onSurface={onSurface}
              onSurfaceVariant={onSurfaceVariant}
              surfaceVariant={surfaceVariant}
              primary={primary}
            />
          ))
        : renderEmptyNotice(
            'No category attach rates yet — they appear once orders start covering more than one category.',
          )}

      <Text style={[styles.footNote, { color: paperTheme.colors.outline }]}>
        Generated {new Date(data.generatedAt).toLocaleString('en-LK')} · learned from{' '}
        {formatCount(model.stats.transactionCount)} completed order
        {model.stats.transactionCount === 1 ? '' : 's'}
        {data.lookbackDays ? ` from the last ${data.lookbackDays} days` : ''}
      </Text>
    </>
  );
}
