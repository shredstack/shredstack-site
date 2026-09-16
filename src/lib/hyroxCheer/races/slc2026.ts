// HYROX Salt Lake City — Sarah's race.
//
// RACE.locked gates the test panel, the ?start=/?now= URL overrides, and the
// "clear all marks" wipe. See lib/hyroxCheer/testMode.ts: all three also switch
// off on their own two hours before the gun, so forgetting this flag can't cost
// Sarah her race data or show a spectator a simulated clock.
//
// Deliberately NOT gated by it: the spectator start-time correction (see
// lib/hyroxCheer/startOverride.ts). A late wave is a race-day problem, so its
// fix has to work on race day, with the race locked. It has its own guard rails
// — a bounded offset and a race-day-only window — instead of this flag.
//
// Locked on 16 September 2026, two days out, once testing was finished. Setting
// this back to false on or after 17 September 1:50 PM MT does nothing: the
// two-hour window in testMode.ts has the final say by then.
export const RACE = {
  slug: 'slc-2026',
  athleteName: 'SARAH',
  eventLabel: "HYROX Salt Lake City · Women's Open Singles",
  // Absolute instant, explicit UTC offset — do not rebuild with new Date(y,m,d,h,m).
  // Real start: Friday 18 September 2026, 3:50:00 PM, America/Denver (MDT, UTC-6).
  startISO: '2026-09-18T15:50:00-06:00',
  timeZone: 'America/Denver',
  /** Short label shown after every time of day, e.g. "3:54:30 PM MT". */
  timeZoneLabel: 'MT',
  /** Band labels — the two goal lines drawn on every card. */
  goldLabel: '1:05',
  planLabel: '1:08',
  /** Race day. No test panel, no ?now=/?start=, no wiping the board. */
  locked: true,
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
  /** Duration of this segment alone (seconds) on the 1:08 race plan — the main pace. */
  planSeconds: number;
  /** Duration of this segment alone (seconds) on the 1:05 "dream day" line. */
  goldSeconds: number;
}

// Source of truth: "SLC Hyrox Split Targets (1).pdf" (updated Sept 16 2026 with the
// SLC course map and Sarah's own station estimates), the "Your plan 1:08:00" column.
//
// Two things about how the PDF's numbers map onto these 16 cards:
//
// 1. Roxzone. The PDF lists each transition as its own row, and its "Race-clock
//    checkpoints" table is measured at "you exit the Roxzone after each station and
//    start the next run". So each station segment below carries its own work time
//    PLUS the Roxzone that follows it. That makes every station's cumulative total
//    here land exactly on the PDF checkpoint table (SkiErg 8:22, Sled Push 15:43,
//    Sled Pull 24:52, Burpees 33:35, Row 42:52, Farmers 49:29, Sandbag 58:36,
//    Wall Balls 1:08:00), which is what a spectator at the course actually sees.
//    Run 8 already includes ~0:25 of Roxzone in the PDF (both timing systems count
//    the walk into wall balls as part of run 8), so it is left as the PDF has it.
//
// 2. Run 1 is NOT 1 km. Per the course map, run 1 starts in the tunnel and skips
//    ~310-340 m that every other run covers, putting it at ~660-690 m; the PDF
//    plans it at 700 m / 3:06. It is the fastest split on the card, not the slowest.
//
// The 1:05 gold line is the 1:08 plan scaled down proportionally: 180 seconds
// removed, 90 from the runs and 90 from the stations, each segment within a second
// of its exact proportional share, and segments that are equal on the plan kept
// equal here. Totals land on exactly 65:00 and 68:00. (This is a straight scaling,
// not the PDF's "Match Angel" column — that one targets 1:06:22 and redistributes
// unevenly. Sarah asked for a proportional 1:05 band.)
export const SEGMENTS: Segment[] = [
  {
    index: 0,
    kind: 'run',
    name: 'Run 1',
    meta: '~700 m · 3:06 · 4:26/km — the short one',
    yell: "Shortest run of the day: she skips the bottom straight out of the start tunnel. She should come through in about 3:06 — that's on pace, not a flyer.",
    icon: 'dino-running',
    planSeconds: 186,
    goldSeconds: 178,
  },
  {
    index: 1,
    kind: 'station',
    name: 'SkiErg',
    meta: '1000 m · 4:56 work + 0:20 roxzone',
    yell: 'Hips hinge, pull past the pockets. Screen should read about 2:28 per 500 — every second under that is buffer for later.',
    icon: 'dino-running',
    planSeconds: 316,
    goldSeconds: 302,
  },
  {
    index: 2,
    kind: 'run',
    name: 'Run 2',
    meta: '1 km · 4:26 · 4:26/km',
    yell: 'Off the erg and moving. First full kilometre before the sleds — get loud early.',
    icon: 'dino-running',
    planSeconds: 266,
    goldSeconds: 254,
  },
  {
    index: 3,
    kind: 'station',
    name: 'Sled Push',
    meta: '50 m · 102 kg · 2:07 work + 0:48 roxzone',
    yell: "Treat 2:07 as a ceiling, not a target — sleds are the station she gets the least practice on. Save your loudest for the walk out of the roxzone.",
    icon: 'nugget',
    planSeconds: 175,
    goldSeconds: 167,
  },
  {
    index: 4,
    kind: 'run',
    name: 'Run 3',
    meta: '1 km · 4:26 · 4:26/km',
    yell: "Legs know what's coming. Steady turnover, save something for the pull.",
    icon: 'dino-running',
    planSeconds: 266,
    goldSeconds: 254,
  },
  {
    index: 5,
    kind: 'station',
    name: 'Sled Pull',
    meta: '50 m · 78 kg · 4:01 work + 0:42 roxzone',
    yell: 'The longest station on the plan. Form gets scrappy, but she keeps it moving — sit back, hand over hand, and get out of the roxzone fast.',
    icon: 'dino',
    planSeconds: 283,
    goldSeconds: 270,
  },
  {
    index: 6,
    kind: 'run',
    name: 'Run 4',
    meta: '1 km · 4:26 · 4:26/km',
    yell: 'Last of the 4:26 runs — everything after this one is planned quicker. Halfway home.',
    icon: 'dino-running',
    planSeconds: 266,
    goldSeconds: 254,
  },
  {
    index: 7,
    kind: 'station',
    name: 'Burpee Broad Jumps',
    meta: '80 m · 3:40 work + 0:37 roxzone',
    yell: 'Slow and unbroken on purpose — 3:40 here is traded for a stronger run 5. Chest down, jump long, count them down for her.',
    icon: 'ketchup',
    planSeconds: 257,
    goldSeconds: 246,
  },
  {
    index: 8,
    kind: 'run',
    name: 'Run 5',
    meta: '1 km · 4:21 · 4:21/km',
    yell: 'The gear change. Runs 5 through 8 are planned five seconds a kilometre quicker than the first four — this is the one she paid for on the burpees.',
    icon: 'dino-running',
    planSeconds: 261,
    goldSeconds: 250,
  },
  {
    index: 9,
    kind: 'station',
    name: 'Row',
    meta: '1000 m · 4:30 work + 0:26 roxzone',
    yell: 'Watch the split: 2:15 per 500 or better. Then move — the transition in and out of the rower is where time hides.',
    icon: 'dino-running',
    planSeconds: 296,
    goldSeconds: 283,
  },
  {
    index: 10,
    kind: 'run',
    name: 'Run 6',
    meta: '1 km · 4:21 · 4:21/km',
    yell: "Biggest checkpoint of the day is right behind her. Grip's been through it — loose arms, quick feet.",
    icon: 'dino-running',
    planSeconds: 261,
    goldSeconds: 250,
  },
  {
    index: 11,
    kind: 'station',
    name: 'Farmers Carry',
    meta: '200 m · 2×16 kg · 1:30 work + 0:46 roxzone',
    yell: "Unbroken, no exceptions — 1:30 is faster than either of her benchmark athletes ran it. If she's jogging with them, that is exactly the plan.",
    icon: 'nugget',
    planSeconds: 136,
    goldSeconds: 130,
  },
  {
    index: 12,
    kind: 'run',
    name: 'Run 7',
    meta: '1 km · 4:21 · 4:21/km',
    yell: 'Second-to-last run. This is where a race gets won or lost — stay on her.',
    icon: 'dino-running',
    planSeconds: 261,
    goldSeconds: 250,
  },
  {
    index: 13,
    kind: 'station',
    name: 'Sandbag Lunges',
    meta: '100 m · 10 kg · 4:00 work + 0:46 roxzone',
    yell: "Bag never touches the ground, knee taps every rep. The row and the farmers carry already paid for this one, so steady beats fast.",
    icon: 'dino',
    planSeconds: 286,
    goldSeconds: 273,
  },
  {
    index: 14,
    kind: 'run',
    name: 'Run 8',
    meta: '1 km + the walk in · 4:44 · ~4:19/km',
    yell: 'Last kilometre, and the clock keeps running through the walk into wall balls. Everything left goes into this one — bring her home.',
    icon: 'dino-running',
    planSeconds: 284,
    goldSeconds: 271,
  },
  {
    index: 15,
    kind: 'station',
    name: 'Wall Balls',
    meta: '100 reps · 4 kg · 4:40 to the finish line',
    yell: 'Her best movement and the biggest place to bank time. Shoulders quit before legs — plan is 50, then 30, then 20. Scream.',
    icon: 'ketchup',
    planSeconds: 280,
    goldSeconds: 268,
  },
];
