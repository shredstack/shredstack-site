import type {
  MobilityExercise,
  MobilityExerciseDay,
  MobilityExerciseVideo,
} from '@/db/schema';

export type MobilityCategory = 'exercise' | 'stretch' | 'recovery_at_athlecare';

// What the client sees: a base exercise plus its joined day assignments and videos.
export interface ExerciseVideoEntry {
  id: number;
  url: string;
  filename: string | null;
  label: string | null;
  sortOrder: number;
}

export interface ExerciseWithRelations extends MobilityExercise {
  // Days the exercise appears on. [] for stretch/recovery_at_athlecare items (they appear every day).
  // Sorted ascending.
  days: number[];
  // Per-day order map (day -> orderInDay) for rotational exercises. Empty for non-rotational.
  orderByDay: Record<number, number>;
  videos: ExerciseVideoEntry[];
}

// Build the joined client shape from the three raw rowsets.
// Sort: videos by (sortOrder asc, id asc); days by ascending integer.
export function hydrateExercises(
  exercises: MobilityExercise[],
  dayLinks: MobilityExerciseDay[],
  videos: MobilityExerciseVideo[],
): ExerciseWithRelations[] {
  const dayMap = new Map<number, MobilityExerciseDay[]>();
  for (const link of dayLinks) {
    const list = dayMap.get(link.exerciseId) ?? [];
    list.push(link);
    dayMap.set(link.exerciseId, list);
  }
  const videoMap = new Map<number, ExerciseVideoEntry[]>();
  for (const v of videos) {
    const list = videoMap.get(v.exerciseId) ?? [];
    list.push({
      id: v.id,
      url: v.url,
      filename: v.filename,
      label: v.label,
      sortOrder: v.sortOrder,
    });
    videoMap.set(v.exerciseId, list);
  }
  return exercises.map((ex) => {
    const links = (dayMap.get(ex.id) ?? []).slice().sort((a, b) => a.day - b.day);
    const orderByDay: Record<number, number> = {};
    for (const link of links) orderByDay[link.day] = link.orderInDay;
    const exerciseVideos = (videoMap.get(ex.id) ?? []).slice().sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id - b.id;
    });
    return {
      ...ex,
      days: links.map((l) => l.day),
      orderByDay,
      videos: exerciseVideos,
    };
  });
}

// Validate a days[] array for a rotational exercise.
export function normalizeDaysArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const set = new Set<number>();
  for (const v of value) {
    if (v !== 1 && v !== 2 && v !== 3) return null;
    set.add(v);
  }
  if (set.size === 0) return null;
  return [...set].sort((a, b) => a - b);
}

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
