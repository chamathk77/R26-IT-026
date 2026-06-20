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
  purchaseDate?: string;
}

export interface CreateCostExpenseResponse {
  success: boolean;
  data?: CostExpense;
  message?: string;
}
