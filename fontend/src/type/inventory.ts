/** Params when opening the product form in edit mode. */
export type InventoryProductFormParams = {
  id: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  type: 'product' | 'service';
  amount: number | null;
  cost: number | null;
  isInventoryAvailable: boolean;
  barcode: string | null;
  qty: number | null;
  image?: string;
};
