// One rule, used by both the page and the API, for whether a race's testing
// affordances are live: the ?start= / ?now= clock overrides, the test panel,
// and the "clear all marks" wipe.

/**
 * How long before the gun testing shuts off, regardless of the `locked` flag.
 *
 * `locked` is the deliberate switch and should still be flipped before race
 * week. This window is the safety net for forgetting: on race day the clock
 * every spectator sees must be the real one, and the marks must not be
 * wipeable by anyone holding the shared link.
 */
export const TEST_MODE_CUTOFF_BEFORE_START_MS = 2 * 60 * 60 * 1000;

/**
 * Call with the real wall clock, never a simulated one — the point is that a
 * ?now= in someone's URL can't talk the page back into test mode.
 */
export function testModeActive(
  race: { locked: boolean; startISO: string },
  nowMs: number = Date.now()
): boolean {
  if (race.locked) return false;
  return nowMs < new Date(race.startISO).getTime() - TEST_MODE_CUTOFF_BEFORE_START_MS;
}
