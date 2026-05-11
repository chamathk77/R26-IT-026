/** Params when opening the product form in edit mode. */
export type InventoryProductFormParams = {
  id: string;
  name: string;
  categoryId: string;
  unitPrice: number;
  image?: string;
};
