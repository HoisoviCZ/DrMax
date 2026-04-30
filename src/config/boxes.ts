import type { CategoryId } from './categories';

export type BoxShape = 'small' | 'medium' | 'large' | 'blister' | 'bottle' | 'spray';

export interface BoxType {
  shape: BoxShape;
  width: number;
  height: number;
  label: string;
  category: CategoryId;
  /**
   * Optional asset key. If a PNG exists at `public/products/{imageKey}.png`,
   * it overrides the procedural placeholder. Falls back silently if missing.
   */
  imageKey?: string;
}

const SHAPE_DIMS: Record<BoxShape, { width: number; height: number }> = {
  small: { width: 44, height: 54 },
  medium: { width: 64, height: 74 },
  large: { width: 84, height: 94 },
  blister: { width: 80, height: 22 },
  bottle: { width: 36, height: 86 },
  spray: { width: 36, height: 100 },
};

function box(
  shape: BoxShape,
  label: string,
  category: CategoryId,
  imageKey?: string,
): BoxType {
  return { shape, ...SHAPE_DIMS[shape], label, category, imageKey };
}

export const BOX_TYPES: BoxType[] = [
  // OTC
  box('small', 'Paralen', 'otc', 'paralen'),
  box('small', 'Acylpyrin', 'otc', 'acylpyrin'),
  box('medium', 'Ibalgin', 'otc', 'ibalgin'),
  box('medium', 'Nurofen', 'otc', 'nurofen'),
  box('large', 'Smecta', 'otc', 'smecta'),
  box('blister', 'Aspirin', 'otc', 'aspirin'),
  box('bottle', 'Stoptussin', 'otc', 'stoptussin'),
  box('spray', 'Olynth', 'otc', 'olynth'),

  // Rx
  box('small', 'Atorvastatin', 'rx', 'atorvastatin'),
  box('medium', 'Metformin', 'rx', 'metformin'),
  box('blister', 'Warfarin', 'rx', 'warfarin'),
  box('bottle', 'Augmentin', 'rx', 'augmentin'),

  // Cold chain
  box('small', 'Insulin', 'cold', 'insulin'),
  box('bottle', 'Vaccine', 'cold', 'vaccine'),
  box('medium', 'Probiotics', 'cold', 'probiotics'),

  // Supplements
  box('medium', 'Vitamin D', 'supplement', 'vitamin-d'),
  box('large', 'Magnesium', 'supplement', 'magnesium'),
  box('bottle', 'Omega 3', 'supplement', 'omega-3'),
  box('small', 'Zinc', 'supplement', 'zinc'),
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
