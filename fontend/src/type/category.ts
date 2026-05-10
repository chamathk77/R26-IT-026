export interface Category {
  _id: string;
  name: string;
  description: string;
  colorCode: string;
  createdBy?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description: string;
  colorCode: string;
}

export interface CreateCategoryResponse {
  success: boolean;
  data: Category;
}

export interface UpdateCategoryPayload {
  id: string;
  name: string;
  description: string;
  colorCode: string;
}

export interface UpdateCategoryResponse {
  success: boolean;
  data: Category;
}

export interface GetCategoriesResponse {
  success: boolean;
  data: Category[];
}
