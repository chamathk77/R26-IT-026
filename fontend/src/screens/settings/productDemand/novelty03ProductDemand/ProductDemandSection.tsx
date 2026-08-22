import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { useShopIndustry } from '../../../../hooks/useShopIndustry';
import { getApiErrorMessage } from '../../../../utils/apiErrorAlert';
import { fetchProductDemandForecast } from './productDemandService';
import { shareAllProductsDemandReport } from './productDemandPdf';
import { productDemandStyles as styles } from './productDemandStyles';
import type { ProductDemandData, ProductDemandResult } from './productDemandTypes';

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
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [downloadingReport, setDownloadingReport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProductDemandForecast();
      setData(result);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not load the product demand forecast. Please try again.'));
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

  const filteredResults = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return data.results;
    return data.results.filter((result) => result.productName.toLowerCase().includes(normalizedQuery));
  }, [data, query]);

  const handleDownloadReport = useCallback(async () => {
    if (!data || !data.results.length) return;
    setDownloadingReport(true);
    try {
      await shareAllProductsDemandReport({
        results: data.results,
        shop,
        generatedAt: data.generatedAt,
        lookbackDays: data.lookbackDays,
      });
    } catch (err: unknown) {
      Alert.alert('Could not create report', getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setDownloadingReport(false);
    }
  }, [data, shop]);

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

  if (data.dataQuality.level === 'insufficient' || !data.results.length) {
    return (
      <View style={[styles.noticeCard, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
        <Ionicons name="information-circle-outline" size={18} color="#b45309" />
        <Text style={[styles.noticeText, { color: '#92400e' }]}>{data.dataQuality.message}</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.engineBadgeRow}>
        <View style={[styles.engineBadge, { backgroundColor: '#dcfce7' }]}>
          <Ionicons name="logo-python" size={13} color="#15803d" />
          <Text style={[styles.engineBadgeText, { color: '#15803d' }]}>Python · statsmodels</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={downloadingReport}
        onPress={() => void handleDownloadReport()}
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
            : `Download report — all ${data.results.length} products`}
        </Text>
      </TouchableOpacity>

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
        {filteredResults.length} of {data.results.length} product{data.results.length === 1 ? '' : 's'}
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

      <Text style={[styles.footNote, { color: paperTheme.colors.outline }]}>
        Generated {new Date(data.generatedAt).toLocaleString('en-LK')} · based on the last{' '}
        {data.lookbackDays} days
      </Text>
    </>
  );
}
