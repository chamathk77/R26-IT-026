export interface CostExpenseCreatedBy {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface CostExpenseCategoryRef {
  _id: string;
  name?: string;
  colorCode?: string;
}

export interface CostExpense {
  _id: string;
  shopId?: string;
  expenseId: string;
  expenseName: string;
  categoryId: CostExpenseCategoryRef | string;
  categoryName: string;
  amount: number;
  isProduct: boolean;
  qty?: number | null;
  image?: string;
  createdBy?: CostExpenseCreatedBy | string;
  updatedBy?: CostExpenseCreatedBy | string;
  purchaseDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCostExpenseRequest {
  expenseName: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  isProduct: boolean;
  qty?: number;
  imageUri?: string | null;
  imageMimeType?: string | null;
  imageFileName?: string | null;
  purchaseDate?: string;
}

export interface CreateCostExpenseResponse {
  success: boolean;
  data?: CostExpense;
  message?: string;
}

export interface CostHistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CostHistoryAppliedFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  categoryName?: string;
}

export interface FetchCostHistoryParams {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  append?: boolean;
}

export interface GetCostHistoryResponse {
  success: boolean;
  count?: number;
  total?: number;
  filters?: CostHistoryAppliedFilters;
  pagination?: CostHistoryPagination;
  data?: CostExpense[];
  message?: string;
}

export interface GetCostExpenseByIdResponse {
  success: boolean;
  data?: CostExpense;
  message?: string;
}

export interface UpdateCostExpenseRequest {
  id: string;
  expenseName?: string;
  categoryId?: string;
  categoryName?: string;
  amount?: number;
  isProduct?: boolean;
  qty?: number;
  purchaseDate?: string;
  removeImage?: boolean;
  imageUri?: string | null;
  imageMimeType?: string | null;
  imageFileName?: string | null;
}

export interface UpdateCostExpenseResponse {
  success: boolean;
  data?: CostExpense;
  message?: string;
}

export interface DeleteCostExpenseResponse {
  success: boolean;
  message?: string;
  id?: string;
  expenseId?: string;
}

export interface CostOverviewCategory {
  categoryId: string;
  categoryName: string;
  colorCode: string;
  expenseCount: number;
  totalAmount: number;
}

export interface CostOverviewData {
  shopId: string;
  monthStart: string;
  monthEnd: string;
  categoryCount: number;
  recordCount: number;
  totalAmount: number;
  categories: CostOverviewCategory[];
}

export interface GetCostOverviewResponse {
  success: boolean;
  data?: CostOverviewData;
  message?: string;
}

export type CostSummaryPeriod =
  | 'current_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_1_year';

export interface FetchCostSummaryParams {
  period?: CostSummaryPeriod;
  startDate?: string;
  endDate?: string;
}

export interface CostSummaryFilters {
  period?: CostSummaryPeriod;
  startDate?: string;
  endDate?: string;
}

export interface CostSummaryData {
  shopId: string;
  filterType: 'period' | 'custom_range';
  period: CostSummaryPeriod | null;
  startDate: string;
  endDate: string;
  filters: CostSummaryFilters;
  categoryCount: number;
  recordCount: number;
  totalAmount: number;
  categories: CostOverviewCategory[];
}

export interface GetCostSummaryResponse {
  success: boolean;
  data?: CostSummaryData;
  message?: string;
}
