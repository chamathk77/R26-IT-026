import { CartLineItem, CartOrder, CartOrderItem, CartSessionSummary, CartStatus } from '../type/cart';

function resolveProductId(product: CartLineItem['product']): string {
  return typeof product === 'string' ? product : product._id;
}

export function buildCartOrderFromLines(
  sessionId: string,
  lines: CartLineItem[],
  summary?: Partial<
    Pick<
      CartSessionSummary,
      | 'totalAmount'
      | 'status'
      | 'isDiscount'
      | 'isDiscountPercentage'
      | 'isDiscountAmount'
      | 'discount'
      | 'discountedAmount'
    >
  >,
): CartOrder {
  const items: CartOrderItem[] = lines.map((line) => ({
    productId: resolveProductId(line.product),
    name: line.productName,
    quantity: line.quantity,
    productNumber: line.productNumber ?? null,
    kitchenSentQuantity: line.kitchenSentQuantity ?? 0,
  }));

  const firstLine = lines[0];
  const isDiscount = summary?.isDiscount ?? firstLine?.isDiscount ?? false;
  const isDiscountPercentage = summary?.isDiscountPercentage ?? firstLine?.isDiscountPercentage ?? false;
  const isDiscountAmount = summary?.isDiscountAmount ?? firstLine?.isDiscountAmount ?? false;
  const discount = summary?.discount ?? firstLine?.discount ?? 0;
  const discountedAmount = summary?.discountedAmount ?? firstLine?.discountedAmount ?? 0;

  const lineTotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);
  // If summary provided a totalAmount (e.g. discounted combo total), use it;
  // otherwise if cart has cartTotalPrice from line or discountedAmount, calculate final price.
  let calculatedTotal = summary?.totalAmount ?? lineTotal;
  if (summary?.totalAmount === undefined && isDiscount && discountedAmount > 0) {
    calculatedTotal = Math.max(0, lineTotal - discountedAmount);
  } else if (summary?.totalAmount === undefined && firstLine?.cartTotalPrice != null) {
    calculatedTotal = firstLine.cartTotalPrice;
  }

  return {
    sessionId,
    items,
    totalPrice: Number(calculatedTotal.toFixed(2)),
    status: summary?.status ?? firstLine?.status ?? 'pending',
    user: firstLine?.user,
    isDiscount,
    isDiscountPercentage,
    isDiscountAmount,
    discount,
    discountedAmount,
    createdAt: firstLine?.createdAt,
    updatedAt: firstLine?.updatedAt,
  };
}

export function buildCartOrderFromSession(
  session: CartSessionSummary,
  lines: CartLineItem[],
): CartOrder {
  return buildCartOrderFromLines(session.sessionId, lines, {
    totalAmount: session.totalAmount,
    status: session.status,
    isDiscount: session.isDiscount,
    isDiscountPercentage: session.isDiscountPercentage,
    isDiscountAmount: session.isDiscountAmount,
    discount: session.discount,
    discountedAmount: session.discountedAmount,
  });
}

export function getCartOrderItemKey(item: CartOrderItem): string {
  return item.productId;
}

export function summarizeCartOrder(order: CartOrder): Pick<CartSessionSummary, 'itemCount' | 'totalAmount'> {
  return {
    itemCount: order.items.length,
    totalAmount: order.totalPrice,
  };
}

export function withCartOrderStatus(order: CartOrder, status: CartStatus): CartOrder {
  return { ...order, status };
}
