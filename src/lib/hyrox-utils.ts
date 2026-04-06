// HYROX Training Tracker — constants, scenarios, and finish time calculator

export const HYROX_STATIONS = [
  { id: 'skierg', name: 'SkiErg', raceDistance: '1,000m', unit: 'meters', allowedUnits: ['meters'] },
  { id: 'sled_push', name: 'Sled Push', raceDistance: '50m', unit: 'meters', allowedUnits: ['meters'] },
  { id: 'sled_pull', name: 'Sled Pull', raceDistance: '50m', unit: 'meters', allowedUnits: ['meters'] },
  { id: 'burpee_broad_jump', name: 'Burpee Broad Jumps', raceDistance: '80m', unit: 'meters', allowedUnits: ['meters', 'reps'] },
  { id: 'rowing', name: 'Rowing', raceDistance: '1,000m', unit: 'meters', allowedUnits: ['meters'] },
  { id: 'farmers_carry', name: 'Farmers Carry', raceDistance: '200m', unit: 'meters', allowedUnits: ['meters'] },
  { id: 'sandbag_lunges', name: 'Sandbag Lunges', raceDistance: '100m', unit: 'meters', allowedUnits: ['meters', 'reps'] },
  { id: 'wall_balls', name: 'Wall Balls', raceDistance: '100 reps', unit: 'reps', allowedUnits: ['reps'] },
] as const;

export type StationId = typeof HYROX_STATIONS[number]['id'];

export type SegmentId = StationId | 'run_1km';

// Scenario A: Aspirational station times (result of 24 weeks of training)
// Estimated finish: ~58:30
export const SCENARIO_A: Record<SegmentId, number> = {
  run_1km: 243,            // 4:03 avg per km
  skierg: 225,              // 3:45
  sled_push: 105,           // 1:45
  sled_pull: 105,           // 1:45
  burpee_broad_jump: 165,   // 2:45
  rowing: 225,              // 3:45
  farmers_carry: 105,       // 1:45
  sandbag_lunges: 165,      // 2:45
  wall_balls: 195,          // 3:15
};

// Scenario B: Current station abilities
// Estimated finish: ~59:32
export const SCENARIO_B: Record<SegmentId, number> = {
  run_1km: 224,             // 3:44 avg per km
  skierg: 270,              // 4:30
  sled_push: 150,           // 2:30
  sled_pull: 210,           // 3:30
  burpee_broad_jump: 210,   // 3:30
  rowing: 250,              // 4:10
  farmers_carry: 105,       // 1:45
  sandbag_lunges: 210,      // 3:30
  wall_balls: 225,          // 3:45
};

export const TRANSITION_SECONDS = 300; // ~5 min total for 8 station transitions

export const RACE_DATE = new Date('2026-09-18');
export const PLAN_START_DATE = new Date('2026-04-06');

export const PHASES = [
  { number: 1, name: 'Foundation', weeks: '1-4', dates: 'Apr 6 - May 3', key: 'foundation' },
  { number: 2, name: 'Base Building', weeks: '5-8', dates: 'May 4 - May 31', key: 'base_building' },
  { number: 3, name: 'Aerobic Development', weeks: '9-12', dates: 'Jun 1 - Jun 28', key: 'aerobic_dev' },
  { number: 4, name: 'Threshold Push', weeks: '13-16', dates: 'Jun 29 - Jul 26', key: 'threshold_push' },
  { number: 5, name: 'Race Specificity', weeks: '17-20', dates: 'Jul 27 - Aug 23', key: 'race_specificity' },
  { number: 6, name: 'Peak & Taper', weeks: '21-24', dates: 'Aug 24 - Sep 18', key: 'peak_taper' },
] as const;

export type SessionType =
  | 'station_skills'
  | 'easy_run'
  | 'tempo_run'
  | 'race_pace_run'
  | 'hyrox_intervals'
  | 'hyrox_simulation'
  | 'full_hyrox_sim'
  | 'station_tuneup'
  | 'shakeout_run'
  | 'activation'
  | 'race_day';

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDelta(deltaSeconds: number): string {
  const sign = deltaSeconds <= 0 ? '-' : '+';
  const abs = Math.abs(deltaSeconds);
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;
  return `${sign}${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function sumScenario(scenario: Record<SegmentId, number>): number {
  const runTotal = scenario.run_1km * 8;
  const stationTotal = HYROX_STATIONS.reduce((sum, s) => sum + scenario[s.id], 0);
  return runTotal + stationTotal + TRANSITION_SECONDS;
}

export interface EstimateSegment {
  station: SegmentId;
  name: string;
  currentSeconds: number | null;
  targetA: number;
  targetB: number;
  delta: number | null;
  usingFallback: boolean;
}

export const DEFAULT_FINISH_SECONDS = 5400; // 1:30:00 default for new users

export interface EstimateResult {
  estimatedFinishSeconds: number;
  estimatedFinish: string;
  totalRunSeconds: number | null;
  totalStationSeconds: number | null;
  transitionSeconds: number;
  isDefault: boolean;
  segments: EstimateSegment[];
  missingStations: SegmentId[];
  readiness: { benchmarked: number; total: number; percentage: number };
  scenarioComparison: { vsA: string; vsB: string } | null;
}

export function calculateEstimate(benchmarks: Partial<Record<SegmentId, number>>): EstimateResult {
  const stationIds = HYROX_STATIONS.map(s => s.id);
  const allSegmentIds: SegmentId[] = ['run_1km', ...stationIds];

  const segments: EstimateSegment[] = allSegmentIds.map(s => ({
    station: s,
    name: s === 'run_1km' ? 'Run (1km avg)' : HYROX_STATIONS.find(st => st.id === s)!.name,
    currentSeconds: benchmarks[s] ?? null,
    targetA: SCENARIO_A[s],
    targetB: SCENARIO_B[s],
    delta: benchmarks[s] != null ? benchmarks[s]! - SCENARIO_A[s] : null,
    usingFallback: benchmarks[s] == null,
  }));

  const missing = segments.filter(s => s.usingFallback).map(s => s.station);
  const allBenchmarked = missing.length === 0;

  if (!allBenchmarked) {
    return {
      estimatedFinishSeconds: DEFAULT_FINISH_SECONDS,
      estimatedFinish: formatTime(DEFAULT_FINISH_SECONDS),
      totalRunSeconds: null,
      totalStationSeconds: null,
      transitionSeconds: TRANSITION_SECONDS,
      isDefault: true,
      segments,
      missingStations: missing,
      readiness: {
        benchmarked: 9 - missing.length,
        total: 9,
        percentage: Math.round(((9 - missing.length) / 9) * 100),
      },
      scenarioComparison: null,
    };
  }

  const runTotal = benchmarks.run_1km! * 8;
  const stationTotal = stationIds.reduce((sum, s) => sum + benchmarks[s]!, 0);
  const total = runTotal + stationTotal + TRANSITION_SECONDS;

  return {
    estimatedFinishSeconds: total,
    estimatedFinish: formatTime(total),
    totalRunSeconds: runTotal,
    totalStationSeconds: stationTotal,
    transitionSeconds: TRANSITION_SECONDS,
    isDefault: false,
    segments,
    missingStations: missing,
    readiness: {
      benchmarked: 9,
      total: 9,
      percentage: 100,
    },
    scenarioComparison: {
      vsA: formatDelta(total - sumScenario(SCENARIO_A)),
      vsB: formatDelta(total - sumScenario(SCENARIO_B)),
    },
  };
}

export function getDaysUntilRace(): number {
  const now = new Date();
  const diff = RACE_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getCurrentWeek(): number {
  const now = new Date();
  const diff = now.getTime() - PLAN_START_DATE.getTime();
  const week = Math.ceil(diff / (1000 * 60 * 60 * 24 * 7));
  return Math.max(1, Math.min(24, week));
}

export function getPhaseForWeek(week: number): typeof PHASES[number] {
  const idx = Math.min(5, Math.floor((week - 1) / 4));
  return PHASES[idx];
}

export function getSessionTypeLabel(type: SessionType): string {
  const labels: Record<SessionType, string> = {
    station_skills: 'Station Skills',
    easy_run: 'Easy Run',
    tempo_run: 'Tempo Run',
    race_pace_run: 'Race Pace Run',
    hyrox_intervals: 'HYROX Intervals',
    hyrox_simulation: 'HYROX Simulation',
    full_hyrox_sim: 'Full HYROX Sim',
    station_tuneup: 'Station Tune-Up',
    shakeout_run: 'Shakeout Run',
    activation: 'Activation',
    race_day: 'Race Day',
  };
  return labels[type] || type;
}

export function isRunSession(type: SessionType): boolean {
  return ['easy_run', 'tempo_run', 'race_pace_run', 'shakeout_run'].includes(type);
}

export function isStationSession(type: SessionType): boolean {
  return type === 'station_skills';
}

export function isHyroxSession(type: SessionType): boolean {
  return ['hyrox_intervals', 'hyrox_simulation', 'full_hyrox_sim', 'station_tuneup'].includes(type);
}

export function getDayLabel(day: string): string {
  const labels: Record<string, string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
  };
  return labels[day] || day;
}
