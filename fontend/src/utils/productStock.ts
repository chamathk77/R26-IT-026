import { Product } from '../type/product';

type StockProduct = Pick<Product, 'productName' | 'isInventoryAvailable' | 'qty'>;

export function getStockLimitToastMessage(product: StockProduct, cartQty: number): string | null {
  if (!product.isInventoryAvailable) return null;

  const stockQty = product.qty ?? 0;
  if (stockQty <= 0) {
    return `${product.productName} is out of stock`;
  }
  if (cartQty >= stockQty) {
    return `Only ${stockQty} in stock for ${product.productName}`;
  }
  return null;
}

export function isAtProductStockLimit(product: Pick<Product, 'isInventoryAvailable' | 'qty'>, cartQty: number): boolean {
  if (!product.isInventoryAvailable) return false;
  return cartQty >= (product.qty ?? 0);
}
