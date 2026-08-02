export interface CategoryCreatedBy {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface Category {
  _id: string;
  shopId?: string;
  name: string;
  description?: string;
  colorCode: string;
  createdBy?: CategoryCreatedBy | string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  colorCode: string;
}

export interface CreateCategoryResponse {
  success: boolean;
  data: Category;
}

export interface UpdateCategoryPayload {
  id: string;
  name: string;
  description?: string;
  colorCode: string;
}

export interface UpdateCategoryResponse {
  success: boolean;
  data: Category;
}

export interface GetCategoriesResponse {
  success: boolean;
  count: number;
  data: Category[];
}

export interface GetCategoryByIdResponse {
  success: boolean;
  data: Category;
}

export interface DeleteCategoryResponse {
  success: boolean;
  message?: string;
  id?: string;
  count?: number;
}
