// The real gun time, when it isn't the scheduled one.
//
// HYROX waves don't always go off on schedule — a late-afternoon wave in
// particular can slip while the floor clears. If the gun is 12 minutes late,
// every number on the cheer page is 12 minutes wrong for the whole race: the
// race clock, every segment's "should be done by" time of day, the finish
// estimate, the standing tag. And the ?start= override used during testing is
// deliberately dead by then (see testMode.ts — that is the point of it).
//
// So spectators get their own way to correct it, live, for everyone on the
// shared board. This module is the one rule both the dialog and the API route
// check against, so the button can never offer something the server refuses.

/**
 * Earliest gun a spectator may set, relative to the scheduled start.
 *
 * Small and negative on purpose: waves go late, not early, so the only honest
 * reason to move the gun backwards is trimming a few seconds off a time
 * somebody eyeballed. Anything bigger is a mistake or a prank.
 */
export const START_OVERRIDE_MIN_OFFSET_MS = -15 * 60 * 1000;

/** Latest gun a spectator may set. Covers a wave pushed to a later slot. */
export const START_OVERRIDE_MAX_OFFSET_MS = 6 * 60 * 60 * 1000;

/** The override can only be touched from this long before the scheduled gun… */
export const START_OVERRIDE_WINDOW_BEFORE_MS = 12 * 60 * 60 * 1000;

/**
 * …to this long after it. Past that the splits are a permanent record and
 * nobody idly scrolling the page months later gets to rewrite the race clock.
 */
export const START_OVERRIDE_WINDOW_AFTER_MS = 24 * 60 * 60 * 1000;

export type StartOverrideCheck = { ok: true } | { ok: false; error: string };

function minutes(ms: number): string {
  const total = Math.round(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.round((total % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m} minutes`;
}

/**
 * Whether `candidateMs` is a start time this race will accept right now.
 *
 * `null` for the candidate means "clear the override, go back to the scheduled
 * gun" — always legal inside the editing window.
 *
 * Errors come back as finished sentences because the dialog shows them to a
 * spectator standing at a barrier, not to a developer.
 *
 * `ignoreWindow` drops only the race-day window, never the offset bounds, and
 * is passed straight from `testModeActive` on both sides. Without it the
 * feature would be untestable before race week — which is precisely when it
 * needs testing.
 */
export function checkStartOverride(
  scheduledMs: number,
  candidateMs: number | null,
  nowMs: number,
  options: { ignoreWindow?: boolean } = {}
): StartOverrideCheck {
  if (!options.ignoreWindow && nowMs < scheduledMs - START_OVERRIDE_WINDOW_BEFORE_MS) {
    return {
      ok: false,
      error: 'The start time can only be changed on race day — it is still too early.',
    };
  }
  if (!options.ignoreWindow && nowMs > scheduledMs + START_OVERRIDE_WINDOW_AFTER_MS) {
    return {
      ok: false,
      error: 'The race is over and these splits are locked in. The start time can no longer be changed.',
    };
  }
  if (candidateMs === null) return { ok: true };
  if (!Number.isFinite(candidateMs)) {
    return { ok: false, error: "That isn't a valid time." };
  }

  const offset = candidateMs - scheduledMs;
  if (offset < START_OVERRIDE_MIN_OFFSET_MS) {
    return {
      ok: false,
      error: `That is more than ${minutes(START_OVERRIDE_MIN_OFFSET_MS)} before the scheduled gun. Waves run late, not early — check the time.`,
    };
  }
  if (offset > START_OVERRIDE_MAX_OFFSET_MS) {
    return {
      ok: false,
      error: `That is more than ${minutes(START_OVERRIDE_MAX_OFFSET_MS)} after the scheduled gun. If the wave really moved that far, the page needs a code change.`,
    };
  }
  return { ok: true };
}
