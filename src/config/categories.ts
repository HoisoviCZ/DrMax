export type CategoryId = 'cold' | 'rx' | 'otc' | 'supplement';

export interface Category {
  id: CategoryId;
  name: string;
  color: number;
  hex: string;
  description: string;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  cold: {
    id: 'cold',
    name: 'Cold Chain',
    color: 0xe53935,
    hex: '#e53935',
    description: 'Stored at 2-8 °C',
  },
  rx: {
    id: 'rx',
    name: 'Prescription',
    color: 0x1e88e5,
    hex: '#1e88e5',
    description: 'Requires a doctor’s prescription',
  },
  otc: {
    id: 'otc',
    name: 'Over the Counter',
    color: 0x43a047,
    hex: '#43a047',
    description: 'No prescription required',
  },
  supplement: {
    id: 'supplement',
    name: 'Supplements',
    color: 0xfb8c00,
    hex: '#fb8c00',
    description: 'Vitamins and minerals',
  },
};

export const CATEGORY_ORDER: CategoryId[] = ['cold', 'rx', 'otc', 'supplement'];
