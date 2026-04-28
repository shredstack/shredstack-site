export type Slot = 'training' | 'core' | 'stretch';

export const SLOTS: readonly Slot[] = ['training', 'core', 'stretch'] as const;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface TrainingBlock {
  // Day theme tied to a HYROX station emphasis.
  theme: string;
  // HYROX context — which stations this supports.
  hyroxFocus: string;
  // Header-style scheme line (e.g., "4 rounds, ~5 min").
  scheme: string;
  exercises: string[];
}

export interface ProgramWeek {
  week: 1 | 2 | 3 | 4;
  // Cycle-week progression theme (Foundation, Volume, etc.).
  phase: string;
  // Mon, Tue, Wed, Thu — index 0..3 maps to WEEKDAYS.
  days: readonly [TrainingBlock, TrainingBlock, TrainingBlock, TrainingBlock];
}

// HYROX station prep, organized by day-of-week emphasis:
//   Mon — push/pull endurance (ski erg + sled prep)
//   Tue — lunge & squat endurance (sandbag lunges + wall balls)
//   Wed — carries & grip (farmers carry, sandbag hold)
//   Thu — power & plyo (burpee broad jumps)
// Cycle-week phases: Foundation → Volume → Intensity → Deload.
export const PROGRAM: readonly ProgramWeek[] = [
  {
    week: 1,
    phase: 'Foundation',
    days: [
      {
        theme: 'Push/pull endurance',
        hyroxFocus: 'Ski erg + sled prep',
        scheme: '4 rounds, ~5 min',
        exercises: [
          '10 DB strict press',
          '12 banded face pulls',
          '8 push-ups',
        ],
      },
      {
        theme: 'Lunge & squat endurance',
        hyroxFocus: 'Sandbag lunges + wall balls',
        scheme: '4 rounds, ~5 min',
        exercises: [
          '10 goblet squats',
          '6 reverse lunges / leg',
          ':20 wall sit',
        ],
      },
      {
        theme: 'Carries & grip',
        hyroxFocus: 'Farmers carry + sandbag hold',
        scheme: '4 rounds, ~5 min',
        exercises: [
          ':30 DB farmers hold',
          '10 single-leg RDLs / side',
          '12 banded pull-aparts',
        ],
      },
      {
        theme: 'Power & plyo',
        hyroxFocus: 'Burpee broad jumps',
        scheme: '4 rounds, ~5 min',
        exercises: [
          '5 broad jumps',
          '8 jump squats',
          '6 burpees',
        ],
      },
    ],
  },
  {
    week: 2,
    phase: 'Volume',
    days: [
      {
        theme: 'Push/pull endurance',
        hyroxFocus: 'Ski erg + sled prep',
        scheme: '5 rounds, ~6 min',
        exercises: [
          '12 DB push press',
          '15 banded pull-aparts',
          '10 push-ups',
        ],
      },
      {
        theme: 'Lunge & squat endurance',
        hyroxFocus: 'Sandbag lunges + wall balls',
        scheme: '5 rounds, ~6 min',
        exercises: [
          '12 goblet squats',
          '8 walking lunges / leg',
          ':30 wall sit',
        ],
      },
      {
        theme: 'Carries & grip',
        hyroxFocus: 'Farmers carry + sandbag hold',
        scheme: '5 rounds, ~6 min',
        exercises: [
          ':40 DB farmers hold',
          '12 RDLs',
          '12 banded face pulls',
        ],
      },
      {
        theme: 'Power & plyo',
        hyroxFocus: 'Burpee broad jumps',
        scheme: '5 rounds, ~6 min',
        exercises: [
          '6 broad jumps',
          '10 jump squats',
          '8 burpees',
        ],
      },
    ],
  },
  {
    week: 3,
    phase: 'Intensity',
    days: [
      {
        theme: 'Push/pull endurance',
        hyroxFocus: 'Ski erg + sled prep',
        scheme: '5 rounds, ~7 min',
        exercises: [
          '10 strict DB press (heavy)',
          '12 bent-over rows / side',
          '10 push-ups (slow eccentric)',
        ],
      },
      {
        theme: 'Lunge & squat endurance',
        hyroxFocus: 'Sandbag lunges + wall balls',
        scheme: '5 rounds, ~7 min',
        exercises: [
          '10 DB thrusters',
          '8 walking lunges / leg',
          ':30 wall sit',
        ],
      },
      {
        theme: 'Carries & grip',
        hyroxFocus: 'Farmers carry + sandbag hold',
        scheme: '5 rounds, ~7 min',
        exercises: [
          ':30 DB farmers hold (heavy)',
          '10 single-leg RDLs / side',
          '12 hammer curls',
        ],
      },
      {
        theme: 'Power & plyo',
        hyroxFocus: 'Burpee broad jumps',
        scheme: '5 rounds, ~7 min',
        exercises: [
          '8 broad jumps',
          '10 box jumps (or tall jump squats)',
          '8 burpees',
        ],
      },
    ],
  },
  {
    week: 4,
    phase: 'Deload',
    days: [
      {
        theme: 'Push/pull endurance',
        hyroxFocus: 'Ski erg + sled prep',
        scheme: '4 rounds, ~5 min',
        exercises: [
          '8 strict DB press (light, fast)',
          '10 face pulls',
          ':20 hollow hold',
        ],
      },
      {
        theme: 'Lunge & squat endurance',
        hyroxFocus: 'Sandbag lunges + wall balls',
        scheme: '4 rounds, ~5 min',
        exercises: [
          '8 goblet squats (2s pause)',
          '6 reverse lunges / leg',
          '10 calf raises',
        ],
      },
      {
        theme: 'Carries & grip',
        hyroxFocus: 'Farmers carry + sandbag hold',
        scheme: '4 rounds, ~5 min',
        exercises: [
          ':30 DB farmers hold (moderate)',
          '8 RDLs',
          '10 banded good mornings',
        ],
      },
      {
        theme: 'Power & plyo',
        hyroxFocus: 'Burpee broad jumps',
        scheme: '5 rounds, ~5 min — focus on form',
        exercises: [
          '5 broad jumps',
          '8 pogo hops',
          '6 burpees',
        ],
      },
    ],
  },
] as const;

// Stretch and core routines are flat string arrays so the in-app editor can
// treat all three slots uniformly (one exercise per line).
export const STRETCH_ROUTINE: readonly string[] = [
  "World's greatest stretch — 5 reps / side (~60s)",
  'Couch stretch — 30s / side',
  '90/90 hip switches — 8 reps',
  'Standing forward fold — 30s',
  'Downward dog → calf pedal — 30s',
  'Thread the needle — 30s / side',
  'Doorway pec stretch — 30s / side',
] as const;

export const STRETCH_SCHEME = '~5 minutes';

// 5-minute office core circuit, repeatable for time. No equipment needed.
export const CORE_ROUTINE: readonly string[] = [
  'Plank — 2 min',
  'Side plank — 30s / side',
  'Hollow hold — 30s',
  'Dead bug — 10 reps / side',
  'Situps — 50 reps',
  'Russian Twists — 50 reps / side',
  'Bird dog — 10 reps / side',
  'V-ups — 50 reps',
] as const;

export const CORE_SCHEME = '2 rounds, ~5 min';

// Cycle anchor: Monday April 27, 2026 = Cycle Week 1, Day 1.
// Stored as UTC midnight to avoid TZ drift in the math.
const CYCLE_EPOCH_UTC = Date.UTC(2026, 3, 27);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Returns Mon=0, Tue=1, ..., Sun=6 (ISO weekday minus 1).
function isoWeekdayIndex(date: Date): number {
  const day = date.getUTCDay(); // Sun=0..Sat=6
  return (day + 6) % 7;
}

// Returns the UTC midnight of the Monday on or before the given date.
function startOfIsoWeekUtc(date: Date): number {
  const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return utcMidnight - isoWeekdayIndex(date) * MS_PER_DAY;
}

export function getCycleWeekFor(date: Date): 1 | 2 | 3 | 4 {
  const monday = startOfIsoWeekUtc(date);
  const weeksSinceEpoch = Math.floor((monday - CYCLE_EPOCH_UTC) / (7 * MS_PER_DAY));
  // Modulo that handles negative weeks (dates before the epoch).
  const idx = ((weeksSinceEpoch % 4) + 4) % 4;
  return (idx + 1) as 1 | 2 | 3 | 4;
}

export function getProgramForWeek(cycleWeek: 1 | 2 | 3 | 4): ProgramWeek {
  return PROGRAM[cycleWeek - 1];
}

export function getTrainingBlock(cycleWeek: 1 | 2 | 3 | 4, dayIdx: 0 | 1 | 2 | 3): TrainingBlock {
  return PROGRAM[cycleWeek - 1].days[dayIdx];
}

// Returns YYYY-MM-DD for the Monday of the week containing `date` (UTC).
export function isoMondayOf(date: Date): string {
  const monday = new Date(startOfIsoWeekUtc(date));
  return monday.toISOString().slice(0, 10);
}

// Returns YYYY-MM-DD for the Sunday of the week containing `date` (UTC).
export function isoSundayOf(date: Date): string {
  const sunday = new Date(startOfIsoWeekUtc(date) + 6 * MS_PER_DAY);
  return sunday.toISOString().slice(0, 10);
}

// Returns the array of Mon–Thu YYYY-MM-DD strings for the week containing `date`.
export function weekdayDatesOf(date: Date): [string, string, string, string] {
  const mondayMs = startOfIsoWeekUtc(date);
  return [0, 1, 2, 3].map((offset) =>
    new Date(mondayMs + offset * MS_PER_DAY).toISOString().slice(0, 10),
  ) as [string, string, string, string];
}

// Returns "Mon" | "Tue" | "Wed" | "Thu" for the given date, or null on Fri-Sun.
export function weekdayLabelFor(date: Date): Weekday | null {
  const idx = isoWeekdayIndex(date);
  return idx < 4 ? WEEKDAYS[idx] : null;
}

export function isValidSlot(value: unknown): value is Slot {
  return value === 'training' || value === 'core' || value === 'stretch';
}

// YYYY-MM-DD shape check; trusts the value if it parses to a real date.
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
