export interface ProductCategoryRef {
  _id: string;
  name?: string;
  description?: string;
  colorCode?: string;
}

export interface Product {
  _id: string;
  shopId?: string;
  productName: string;
  categoryId: string | ProductCategoryRef;
  categoryName: string;
  type: 'product' | 'service';
  amount: number | null;
  cost: number | null;
  isInventoryAvailable: boolean;
  barcode: string | null;
  productNumber: string | null;
  qty: number | null;
  warrantyAvailable?: boolean;
  warrantyMonths?: number | null;
  image: string;
  createdBy?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductRequest {
  productName: string;
  categoryId: string;
  categoryName: string;
  type?: 'product' | 'service';
  amount?: number | null;
  cost?: number | null;
  isInventoryAvailable?: boolean;
  barcode?: string | null;
  productNumber?: string | null;
  qty?: number | null;
  warrantyAvailable?: boolean;
  warrantyMonths?: number | null;
  imageUri?: string | null;
}

export interface CreateProductResponse {
  success: boolean;
  data: Product;
}

export interface UpdateProductPayload {
  id: string;
  productName?: string;
  categoryId?: string;
  categoryName?: string;
  type?: 'product' | 'service';
  amount?: number | null;
  cost?: number | null;
  isInventoryAvailable?: boolean;
  barcode?: string | null;
  productNumber?: string | null;
  qty?: number | null;
  warrantyAvailable?: boolean;
  warrantyMonths?: number | null;
  imageUri?: string | null;
}

export interface UpdateProductResponse {
  success: boolean;
  data: Product;
}

export interface GetProductsResponse {
  success: boolean;
  count: number;
  data: Product[];
}

export interface FetchProductsParams {
  productNumber?: string;
  barcode?: string;
  name?: string;
  search?: string;
}

export interface DeleteProductResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    productName: string;
    shopId: string;
  };
}

export function getProductCategoryId(product: Product): string {
  if (product.categoryId && typeof product.categoryId === 'object') {
    return String(product.categoryId._id);
  }
  return String(product.categoryId);
}

export function normalizeProductNumberQuery(value: string): string {
  return String(value ?? '').trim();
}

export function findProductByExactProductNumber(
  products: Product[],
  query: string,
): Product | undefined {
  const normalized = normalizeProductNumberQuery(query);
  if (!normalized) return undefined;

  const lower = normalized.toLowerCase();
  return products.find(
    (product) =>
      normalizeProductNumberQuery(product.productNumber ?? '').toLowerCase() === lower,
  );
}
