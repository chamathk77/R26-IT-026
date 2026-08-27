import { apiClient } from '../../../../../config/apiConfig';
import { ensureInternetConnection } from '../../../../utils/checkInternetConnection';
import { toApiErrorResponse } from '../../../../utils/apiErrorAlert';
import type {
  CategoryAttachRate,
  GetRecommendationInsightsResponse,
  RecommendationInsightsData,
  RecommendationModel,
  RecommendationModelStats,
  RecommendationProductRef,
  RecommendationRule,
  WireCategoryAttach,
  WireInsightsData,
  WireProductRef,
  WireRule,
} from './recommendationsTypes';

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * A reference is only worth rendering if it still has an id; the name falls
 * back to that id so a rule mined before a product was renamed still reads as
 * a sentence instead of a blank.
 */
function toProductRef(wire: WireProductRef | null | undefined): RecommendationProductRef | null {
  const productId = wire?.productId?.trim();
  if (!productId) return null;
  return { productId, productName: wire?.productName?.trim() || productId };
}

function toProductRefs(wires: WireProductRef[] | null | undefined): RecommendationProductRef[] {
  return (wires ?? [])
    .map(toProductRef)
    .filter((ref): ref is RecommendationProductRef => ref !== null);
}

function toStats(
  wire: Partial<RecommendationModelStats> | null | undefined,
): RecommendationModelStats {
  return {
    transactionCount: toNumber(wire?.transactionCount),
    itemCount: toNumber(wire?.itemCount),
    ruleCount: toNumber(wire?.ruleCount),
    pairCount: toNumber(wire?.pairCount),
    avgBasketSize: toNumber(wire?.avgBasketSize),
    coverage: toNumber(wire?.coverage),
  };
}

function toModel(wire: WireInsightsData): RecommendationModel {
  return {
    method: wire.model?.method ?? null,
    modelReady: wire.model?.modelReady === true,
    minimumRequired:
      typeof wire.model?.minimumRequired === 'number' ? wire.model.minimumRequired : null,
    stats: toStats(wire.model?.stats),
  };
}

/** Python already ranked the rules by lift — keep its order, never re-sort. */
function toRules(wires: WireRule[] | null | undefined): RecommendationRule[] {
  return (wires ?? [])
    .map((wire) => {
      const antecedent = toProductRefs(wire.antecedent);
      const consequent = toProductRef(wire.consequent);
      if (!antecedent.length || !consequent) return null;
      return {
        antecedent,
        consequent,
        support: toNumber(wire.support),
        confidence: toNumber(wire.confidence),
        lift: toNumber(wire.lift),
        count: toNumber(wire.count),
      };
    })
    .filter((rule): rule is RecommendationRule => rule !== null);
}

function toCategoryAttach(wires: WireCategoryAttach[] | null | undefined): CategoryAttachRate[] {
  return (wires ?? [])
    .map((wire) => ({
      categoryId: wire.categoryId ?? null,
      categoryName: wire.categoryName?.trim() || 'Uncategorised',
      attachRate: toNumber(wire.attachRate),
      topProducts: toProductRefs(wire.topProducts),
    }))
    .filter((entry) => entry.attachRate > 0);
}

function toInsights(wire: WireInsightsData): RecommendationInsightsData {
  return {
    generatedAt: wire.generatedAt ?? new Date().toISOString(),
    lookbackDays: typeof wire.lookbackDays === 'number' ? wire.lookbackDays : null,
    poweredBy: wire.poweredBy === 'python' ? 'python' : null,
    model: toModel(wire),
    rules: toRules(wire.rules),
    categoryAttach: toCategoryAttach(wire.categoryAttach),
  };
}

/**
 * Deliberately plain (no Redux slice), matching the other three novelties —
 * keeps this novelty conflict-free to merge alongside them.
 */
export async function fetchRecommendationInsights(): Promise<RecommendationInsightsData> {
  try {
    await ensureInternetConnection();

    const response = await apiClient.get<GetRecommendationInsightsResponse>(
      '/api/recommendations/insights',
    );

    if (isHttpSuccess(response.status) && response.data?.success) {
      return toInsights(response.data.data ?? {});
    }

    throw {
      error: 'Error',
      message: response.data?.message || 'Could not load the recommendation insights',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    throw toApiErrorResponse(error);
  }
}
