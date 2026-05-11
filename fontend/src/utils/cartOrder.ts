import { CartLineItem, CartOrder, CartOrderItem, CartSessionSummary, CartStatus } from '../type/cart';

function resolveProductId(product: CartLineItem['product']): string {
  return typeof product === 'string' ? product : product._id;
}

export function buildCartOrderFromLines(
  sessionId: string,
  lines: CartLineItem[],
  summary?: Pick<CartSessionSummary, 'totalAmount' | 'status'>,
): CartOrder {
  const items: CartOrderItem[] = lines.map((line) => ({
    productId: resolveProductId(line.product),
    name: line.productName,
    quantity: line.quantity,
  }));

  const lineTotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);
  const totalPrice = summary?.totalAmount ?? lineTotal;

  return {
    sessionId,
    items,
    totalPrice: Number(totalPrice.toFixed(2)),
    status: summary?.status ?? lines[0]?.status ?? 'pending',
    user: lines[0]?.user,
    createdAt: lines[0]?.createdAt,
    updatedAt: lines[0]?.updatedAt,
  };
}

export function buildCartOrderFromSession(
  session: CartSessionSummary,
  lines: CartLineItem[],
): CartOrder {
  return buildCartOrderFromLines(session.sessionId, lines, {
    totalAmount: session.totalAmount,
    status: session.status,
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
