export type MobilityCategory = 'exercise' | 'stretch' | 'recovery_at_athlecare';

export const CATEGORY_LABELS: Record<MobilityCategory, string> = {
  exercise: 'Exercises',
  stretch: 'Stretches',
  recovery_at_athlecare: 'Recovery at Athlecare',
};

export const CATEGORY_ORDER: MobilityCategory[] = [
  'exercise',
  'stretch',
  'recovery_at_athlecare',
];

// Categories whose items are not tied to a specific day in the rotation.
// They appear on every session regardless of which Day (1/2/3) is active.
export function isDailyCategory(cat: MobilityCategory): boolean {
  return cat === 'stretch' || cat === 'recovery_at_athlecare';
}

// Hint shown at the top of a category section in the user-facing UI.
// null means "no hint, use per-row sets/reps if present".
export const CATEGORY_HINT: Record<MobilityCategory, string | null> = {
  exercise: null,
  stretch: '3 sets × 45s, 3+×/day (min 3×/week)',
  recovery_at_athlecare: null,
};

export const VALID_DAYS = [1, 2, 3] as const;
export type MobilityDay = (typeof VALID_DAYS)[number];

export function isValidDay(value: unknown): value is MobilityDay {
  return value === 1 || value === 2 || value === 3;
}

export function isValidCategory(value: unknown): value is MobilityCategory {
  return (
    value === 'exercise' || value === 'stretch' || value === 'recovery_at_athlecare'
  );
}

export function nextDay(lastDay: number | null): MobilityDay {
  if (lastDay !== 1 && lastDay !== 2 && lastDay !== 3) return 1;
  return ((lastDay % 3) + 1) as MobilityDay;
}

export function localIsoDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
