export interface CostCategoryCreatedBy {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface CostCategory {
  _id: string;
  shopId?: string;
  name: string;
  colorCode: string;
  createdBy?: CostCategoryCreatedBy | string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCostCategoryRequest {
  name: string;
  colorCode: string;
}

export interface CreateCostCategoryResponse {
  success: boolean;
  data?: CostCategory;
  message?: string;
}

export interface UpdateCostCategoryPayload {
  id: string;
  name: string;
  colorCode: string;
}

export interface UpdateCostCategoryResponse {
  success: boolean;
  data?: CostCategory;
  message?: string;
}

export interface GetCostCategoriesResponse {
  success: boolean;
  count: number;
  data: CostCategory[];
}

export interface GetCostCategoryByIdResponse {
  success: boolean;
  data: CostCategory;
}

export interface DeleteCostCategoryResponse {
  success: boolean;
  message?: string;
  id: string;
}
