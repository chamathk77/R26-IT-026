export type CategoryItem = {
  id: string;
  name: string;
  productCount: number;
  color: string;
};

export const DUMMY_CATEGORIES: CategoryItem[] = [
  { id: '1', name: 'Beverages', productCount: 18, color: '#F59E0B' },
  { id: '2', name: 'Snacks', productCount: 24, color: '#10B981' },
  { id: '3', name: 'Dairy', productCount: 12, color: '#3B82F6' },
  { id: '4', name: 'Bakery', productCount: 9, color: '#8B5CF6' },
  { id: '5', name: 'Frozen Foods', productCount: 14, color: '#EF4444' },
];
