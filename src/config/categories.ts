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
    name: 'Chladnička',
    color: 0xe53935,
    hex: '#e53935',
    description: 'Léky uchovávané při 2-8 °C',
  },
  rx: {
    id: 'rx',
    name: 'Na předpis',
    color: 0x1e88e5,
    hex: '#1e88e5',
    description: 'Pouze na lékařský předpis',
  },
  otc: {
    id: 'otc',
    name: 'Volně prodejné',
    color: 0x43a047,
    hex: '#43a047',
    description: 'Bez receptu (OTC)',
  },
  supplement: {
    id: 'supplement',
    name: 'Doplňky stravy',
    color: 0xfb8c00,
    hex: '#fb8c00',
    description: 'Vitamíny a minerály',
  },
};

export const CATEGORY_ORDER: CategoryId[] = ['cold', 'rx', 'otc', 'supplement'];
