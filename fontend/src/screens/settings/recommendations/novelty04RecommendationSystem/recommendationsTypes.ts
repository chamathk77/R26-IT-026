/** Recommendations are mined entirely on the Python analysis backend. */
export type RecommendationEngine = 'python';

export interface RecommendationModelStats {
  transactionCount: number;
  itemCount: number;
  ruleCount: number;
  pairCount: number;
  avgBasketSize: number;
  coverage: number;
}

export interface RecommendationModel {
  method: string | null;
  modelReady: boolean;
  minimumRequired: number | null;
  stats: RecommendationModelStats;
}

/** The model keys on productId; Node joins the catalog name onto it for us. */
export interface RecommendationProductRef {
  productId: string;
  productName: string;
}

/** One association rule: "these products -> that product". */
export interface RecommendationRule {
  antecedent: RecommendationProductRef[];
  consequent: RecommendationProductRef;
  support: number;
  confidence: number;
  lift: number;
  count: number;
}

export interface CategoryAttachRate {
  categoryId: string | null;
  categoryName: string;
  attachRate: number;
  topProducts: RecommendationProductRef[];
}

export interface RecommendationInsightsData {
  generatedAt: string;
  lookbackDays: number | null;
  poweredBy: RecommendationEngine | null;
  model: RecommendationModel;
  rules: RecommendationRule[];
  categoryAttach: CategoryAttachRate[];
}

/**
 * The wire shape is looser than what the screen renders: every rule field is
 * optional here because a model that is not ready yet returns empty stats and
 * no rules at all, and a product can lose its catalog name between the mining
 * run and this read. The service normalises once at that boundary so the UI
 * only ever deals with complete, named values.
 */
export interface WireProductRef {
  productId?: string | null;
  productName?: string | null;
}

export interface WireRule {
  antecedent?: WireProductRef[] | null;
  consequent?: WireProductRef | null;
  support?: number | null;
  confidence?: number | null;
  lift?: number | null;
  count?: number | null;
}

export interface WireCategoryAttach {
  categoryId?: string | null;
  categoryName?: string | null;
  attachRate?: number | null;
  topProducts?: WireProductRef[] | null;
}

export interface WireModel {
  method?: string | null;
  modelReady?: boolean | null;
  minimumRequired?: number | null;
  stats?: Partial<RecommendationModelStats> | null;
}

export interface WireInsightsData {
  generatedAt?: string | null;
  lookbackDays?: number | null;
  poweredBy?: string | null;
  model?: WireModel | null;
  rules?: WireRule[] | null;
  categoryAttach?: WireCategoryAttach[] | null;
}

export interface GetRecommendationInsightsResponse {
  success: boolean;
  shopId?: string;
  branchId?: string;
  data: WireInsightsData;
  message: string;
}
