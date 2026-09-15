// HYROX Salt Lake City — Sarah's race.
//
// RACE.locked gates the test panel and the ?start=/?now= URL overrides.
// TODO(lock): flip `locked` to true before race week (start is Fri 9/18/2026,
// so this must ship locked well before then — the test panel and time
// overrides are for Sarah's own testing only).
export const RACE = {
  slug: 'slc-2026',
  athleteName: 'SARAH',
  eventLabel: "HYROX Salt Lake City · Women's Open Singles",
  // Absolute instant, explicit UTC offset — do not rebuild with new Date(y,m,d,h,m).
  // Real start: Friday 18 September 2026, 3:50:00 PM, America/Denver (MDT, UTC-6).
  startISO: '2026-09-18T15:50:00-06:00',
  timeZone: 'America/Denver',
  locked: false,
} as const;

export type RaceConfig = typeof RACE;

export type SegmentKind = 'run' | 'station';
export type IconKey = 'dino' | 'dino-running' | 'nugget' | 'ketchup';

export interface Segment {
  index: number;
  kind: SegmentKind;
  name: string;
  meta: string;
  yell: string;
  icon: IconKey;
  /** Duration of this segment alone (seconds) at the 1:05 "dream day" goal pace. */
  goldSeconds: number;
  /** Duration of this segment alone (seconds) at the 1:10 "still crushing it" goal pace. */
  tealSeconds: number;
}

// Station work-times and the 1:05 / 1:10 overall goals come from Sarah's original
// cheer card. The 8 running legs weren't broken out as their own checkpoints there —
// their per-segment target duration is back-derived here by subtracting each
// station's known work-time from the gap between that mockup's cumulative
// checkpoints, so the totals still land on exactly 65:00 (gold) / ~70:00 (teal).
// These run splits are inferred, not measured — swap in real target splits any time.
export const SEGMENTS: Segment[] = [
  {
    index: 0,
    kind: 'run',
    name: 'Run 1',
    meta: '1 km · ~4:30/km at gold pace',
    yell: 'First 1K, fresh legs. Let her settle into pace before the SkiErg.',
    icon: 'dino-running',
    goldSeconds: 270,
    tealSeconds: 291,
  },
  {
    index: 1,
    kind: 'station',
    name: 'SkiErg',
    meta: '1000 m · 4:45 work',
    yell: 'Hips hinge, pull past the pockets. Screen should read under 2:25.',
    icon: 'dino-running',
    goldSeconds: 285,
    tealSeconds: 307,
  },
  {
    index: 2,
    kind: 'run',
    name: 'Run 2',
    meta: '1 km · ~4:58/km at gold pace',
    yell: "Off the erg and moving. Quick 1K before the sleds — get loud early.",
    icon: 'dino-running',
    goldSeconds: 298,
    tealSeconds: 321,
  },
  {
    index: 3,
    kind: 'station',
    name: 'Sled Push',
    meta: '50 m · 102 kg · 1:55 work',
    yell: 'Strong station for her. Save your loudest for right after — the next run is her hardest.',
    icon: 'nugget',
    goldSeconds: 115,
    tealSeconds: 124,
  },
  {
    index: 4,
    kind: 'run',
    name: 'Run 3',
    meta: '1 km · ~4:55/km at gold pace',
    yell: "Legs know what's coming. Steady turnover, save something for the pull.",
    icon: 'dino-running',
    goldSeconds: 295,
    tealSeconds: 318,
  },
  {
    index: 5,
    kind: 'station',
    name: 'Sled Pull',
    meta: '50 m · 78 kg · 2:45 work',
    yell: 'Form gets scrappy, but she keeps it moving. Sit back, hand over hand. The run after is her easy one.',
    icon: 'dino',
    goldSeconds: 165,
    tealSeconds: 178,
  },
  {
    index: 6,
    kind: 'run',
    name: 'Run 4',
    meta: '1 km · ~4:55/km at gold pace',
    yell: "Her easy run — this is where she can make up time.",
    icon: 'dino-running',
    goldSeconds: 295,
    tealSeconds: 318,
  },
  {
    index: 7,
    kind: 'station',
    name: 'Burpee Broad Jumps',
    meta: '80 m · 3:15 work',
    yell: 'No breaks here. Chest down, jump long, hold the rhythm. Count them down for her.',
    icon: 'ketchup',
    goldSeconds: 195,
    tealSeconds: 210,
  },
  {
    index: 8,
    kind: 'run',
    name: 'Run 5',
    meta: '1 km · ~4:49/km at gold pace',
    yell: 'Halfway through the run legs. Shake it out before the rower.',
    icon: 'dino-running',
    goldSeconds: 289,
    tealSeconds: 311,
  },
  {
    index: 9,
    kind: 'station',
    name: 'Row',
    meta: '1000 m · 4:20 work',
    yell: 'Watch the split: 2:10 or better. Then move — the rower is where time hides.',
    icon: 'dino-running',
    goldSeconds: 260,
    tealSeconds: 280,
  },
  {
    index: 10,
    kind: 'run',
    name: 'Run 6',
    meta: '1 km · ~4:47/km at gold pace',
    yell: "Grip's been through it. Loose arms, quick feet.",
    icon: 'dino-running',
    goldSeconds: 287,
    tealSeconds: 309,
  },
  {
    index: 11,
    kind: 'station',
    name: 'Farmers Carry',
    meta: '200 m · 2×16 kg · 1:30',
    yell: "Unbroken, no exceptions. If she's jogging with them, that is exactly the plan.",
    icon: 'nugget',
    goldSeconds: 90,
    tealSeconds: 97,
  },
  {
    index: 12,
    kind: 'run',
    name: 'Run 7',
    meta: '1 km · ~4:42/km at gold pace',
    yell: 'Second-to-last run. This is where a race gets won or lost — stay on her.',
    icon: 'dino-running',
    goldSeconds: 282,
    tealSeconds: 304,
  },
  {
    index: 13,
    kind: 'station',
    name: 'Sandbag Lunges',
    meta: '100 m · 10 kg · 3:40 work',
    yell: 'Bag never touches the ground, knee taps every rep. Steady beats fast.',
    icon: 'dino',
    goldSeconds: 220,
    tealSeconds: 237,
  },
  {
    index: 14,
    kind: 'run',
    name: 'Run 8',
    meta: '1 km · ~5:04/km at gold pace',
    yell: 'Last 1K. Everything left goes into this one — bring her home.',
    icon: 'dino-running',
    goldSeconds: 304,
    tealSeconds: 326,
  },
  {
    index: 15,
    kind: 'station',
    name: 'Wall Balls',
    meta: '100 reps · 4 kg · 4:10',
    yell: 'Shoulders quit before legs. Plan is 50, then 30, then 20. Scream.',
    icon: 'ketchup',
    goldSeconds: 250,
    tealSeconds: 269,
  },
];
