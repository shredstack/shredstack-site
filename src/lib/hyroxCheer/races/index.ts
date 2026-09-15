import { RACE as SLC_2026_RACE, SEGMENTS as SLC_2026_SEGMENTS } from './slc2026';

export const HYROX_RACES = {
  [SLC_2026_RACE.slug]: { race: SLC_2026_RACE, segments: SLC_2026_SEGMENTS },
} as const;

export type HyroxRaceSlug = keyof typeof HYROX_RACES;

export function getHyroxRace(slug: string) {
  return (HYROX_RACES as Record<string, (typeof HYROX_RACES)[HyroxRaceSlug]>)[slug];
}

// Listed on /hyrox in this order — SLC 2026 is Sarah's first tracked race.
export const HYROX_RACE_LIST = Object.values(HYROX_RACES).map(({ race, segments }) => ({
  slug: race.slug,
  athleteName: race.athleteName,
  eventLabel: race.eventLabel,
  startISO: race.startISO,
  timeZone: race.timeZone,
  segmentCount: segments.length,
}));
