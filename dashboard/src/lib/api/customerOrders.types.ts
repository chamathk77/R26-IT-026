export type CustomerOrderStatus =
  | 'waiting_confirmation'
  | 'confirmed'
  | 'billed'
  | 'paid';

export interface CustomerMenuShop {
  shopId: string;
  shopName: string;
  address: string;
  phone: string;
}

export interface CustomerMenuBranch {
  branchId: string;
  branchName: string;
  address: string;
  phone: string;
  isMainBranch: boolean;
}

export interface CustomerMenuCategory {
  _id: string;
  name: string;
  colorCode: string;
}

export interface CustomerMenuTable {
  _id: string;
  tableNumber: string;
  tableName: string;
  zone: string;
}

export interface CustomerMenuItem {
  _id: string;
  productName: string;
  productNumber: string | null;
  categoryId: string | null;
  categoryName: string;
  amount: number;
  image: string;
  isInventoryAvailable: boolean;
  qty: number | null;
  available: boolean;
}

export interface CustomerMenu {
  shop: CustomerMenuShop;
  branch: CustomerMenuBranch;
  tableManagement: boolean;
  categories: CustomerMenuCategory[];
  tables: CustomerMenuTable[];
  items: CustomerMenuItem[];
}

export interface PlaceCustomerOrderRequest {
  phone: string;
  customerName?: string;
  tableNumber: string;
  items: { productId: string; quantity: number }[];
  /** Products the customer added from the recommendation step, for acceptance metrics. */
  acceptedRecommendations?: string[];
}

export interface PlacedCustomerOrder {
  orderRef: string;
  orderNumber: number;
  status: CustomerOrderStatus;
  tableNumber: string;
  totalAmount: number;
  placedAt: string;
}

export interface CustomerOrderLine {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CustomerOrder {
  orderRef: string;
  orderNumber: number;
  status: CustomerOrderStatus;
  tableNumber: string;
  totalAmount: number;
  items: CustomerOrderLine[];
  placedAt: string;
  paid: boolean;
}

/** Reason the Python model gave for a suggestion; drives the chip label in the UI. */
export type RecommendationReasonCode =
  | 'frequently_bought_together'
  | 'similar_taste'
  | 'popular_in_category'
  | 'popular_overall'
  | 'personal_favourite';

/** Raw model evidence behind one suggestion; null when that signal did not apply. */
export interface CustomerRecommendationStats {
  support: number | null;
  confidence: number | null;
  lift: number | null;
  similarity: number | null;
  popularity: number | null;
  attachRate: number | null;
}

export interface CustomerRecommendation {
  productId: string;
  productName: string;
  amount: number;
  image: string;
  categoryName: string;
  qty: number | null;
  available: boolean;
  reasonCode: RecommendationReasonCode;
  reason: string;
  score: number;
  stats: CustomerRecommendationStats;
}

/** Model health the Python service reports alongside every ranked list. */
export interface CustomerRecommendationModelStats {
  transactionCount: number;
  itemCount: number;
  ruleCount: number;
  pairCount: number;
  avgBasketSize: number;
  coverage: number;
}

export interface CustomerRecommendationModel {
  method: string | null;
  /** False when the branch has too little order history to mine rules from. */
  modelReady: boolean;
  /** Transactions the model still needs; only set while modelReady is false. */
  minimumRequired: number | null;
  stats: CustomerRecommendationModelStats;
}

export interface CustomerRecommendationsRequest {
  items: { productId: string; quantity: number }[];
  phone?: string;
  limit?: number;
}

export interface CustomerRecommendationsResponse {
  generatedAt: string;
  /** Days of order history the baskets were mined from. */
  lookbackDays: number;
  model: CustomerRecommendationModel;
  poweredBy: string;
  recommendations: CustomerRecommendation[];
}
