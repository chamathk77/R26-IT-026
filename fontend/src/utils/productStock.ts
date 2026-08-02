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

type CheckoutInventoryItem = {
  productId: string;
  quantity: number;
  name: string;
};

export function getCheckoutInventoryError(
  items: CheckoutInventoryItem[],
  productById: Map<string, Pick<Product, 'productName' | 'isInventoryAvailable' | 'qty'>>,
): string | null {
  const totals = new Map<string, { quantity: number; name: string }>();

  for (const item of items) {
    const current = totals.get(item.productId);
    if (current) {
      current.quantity += item.quantity;
      continue;
    }
    totals.set(item.productId, { quantity: item.quantity, name: item.name });
  }

  for (const [productId, { quantity, name }] of totals) {
    const product = productById.get(productId);
    if (!product?.isInventoryAvailable) continue;

    const availableQty = product.qty ?? 0;
    const label = product.productName?.trim() || name;
    if (quantity > availableQty) {
      return `Insufficient stock for ${label}. Available: ${availableQty}, requested: ${quantity}`;
    }
  }

  return null;
}
