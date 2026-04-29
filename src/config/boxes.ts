import type { CategoryId } from './categories';

export type BoxShape = 'small' | 'medium' | 'large' | 'blister' | 'bottle' | 'spray';

export interface BoxType {
  shape: BoxShape;
  width: number;
  height: number;
  label: string;
  category: CategoryId;
}

const SHAPE_DIMS: Record<BoxShape, { width: number; height: number }> = {
  small: { width: 44, height: 54 },
  medium: { width: 64, height: 74 },
  large: { width: 84, height: 94 },
  blister: { width: 80, height: 22 },
  bottle: { width: 36, height: 86 },
  spray: { width: 36, height: 100 },
};

function box(shape: BoxShape, label: string, category: CategoryId): BoxType {
  return { shape, ...SHAPE_DIMS[shape], label, category };
}

export const BOX_TYPES: BoxType[] = [
  // OTC
  box('small', 'Paralen', 'otc'),
  box('small', 'Acylpyrin', 'otc'),
  box('medium', 'Ibalgin', 'otc'),
  box('medium', 'Nurofen', 'otc'),
  box('large', 'Smecta', 'otc'),
  box('blister', 'Aspirin', 'otc'),
  box('bottle', 'Stoptussin', 'otc'),
  box('spray', 'Olynth', 'otc'),

  // Rx
  box('small', 'Atorvastatin', 'rx'),
  box('medium', 'Metformin', 'rx'),
  box('blister', 'Warfarin', 'rx'),
  box('bottle', 'Augmentin', 'rx'),

  // Cold chain
  box('small', 'Insulin', 'cold'),
  box('bottle', 'Vakcína', 'cold'),
  box('medium', 'Probiotika', 'cold'),

  // Supplements
  box('medium', 'Vitamín D', 'supplement'),
  box('large', 'Magnesium', 'supplement'),
  box('bottle', 'Omega 3', 'supplement'),
  box('small', 'Zinek', 'supplement'),
];

export function pickBoxForLevel(level: number): BoxType {
  const allowed = BOX_TYPES.filter((b) => {
    if (level < 2 && b.shape === 'blister') return false;
    if (level < 3 && b.shape === 'spray') return false;
    if (level < 4 && b.category === 'cold') return false;
    return true;
  });
  return allowed[Math.floor(Math.random() * allowed.length)]!;
}
