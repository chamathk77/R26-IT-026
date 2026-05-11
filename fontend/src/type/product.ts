export interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  createdBy?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductRequest {
  name: string;
  category: string;
  price: number;
  imageUri?: string | null;
}

export interface CreateProductResponse {
  success: boolean;
  data: Product;
}

export interface UpdateProductPayload {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUri?: string | null;
}

export interface UpdateProductResponse {
  success: boolean;
  data: Product;
}

export interface GetProductsResponse {
  success: boolean;
  data: Product[];
}
