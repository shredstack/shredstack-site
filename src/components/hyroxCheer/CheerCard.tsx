'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './cheer.module.css';
import { ICONS } from './icons';
import { TestPanel } from './TestPanel';
import type { RaceConfig, Segment } from '@/lib/hyroxCheer/races/slc2026';
import { testModeActive } from '@/lib/hyroxCheer/testMode';
import { checkStartOverride } from '@/lib/hyroxCheer/startOverride';
import {
  formatClock,
  formatClockParts,
  formatDateLong,
  formatDelta,
  formatMinSec,
  formatTimeInputValue,
  getZonedDateParts,
  parseTimeInputValue,
  zonedTimeToInstant,
} from '@/lib/hyroxCheer/time';

interface MarkRecord {
  markedAt: string | null;
  note: string | null;
}

function useSimulatedNow(testMode: boolean, searchParams: URLSearchParams): Date {
  const nowParam = testMode ? searchParams.get('now') : null;
  const lastParamRef = useRef<string | null>(null);
  const baseRef = useRef<{ simBase: number; realBase: number } | null>(null);
  const [, setTick] = useState(0);

  if (nowParam !== lastParamRef.current) {
    lastParamRef.current = nowParam;
    if (nowParam) {
      const seeded = new Date(nowParam).getTime();
      baseRef.current = Number.isNaN(seeded) ? null : { simBase: seeded, realBase: Date.now() };
    } else {
      baseRef.current = null;
    }
  }

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (baseRef.current) {
    return new Date(baseRef.current.simBase + (Date.now() - baseRef.current.realBase));
  }
  return new Date();
}

export function CheerCard({ race, segments }: { race: RaceConfig; segments: Segment[] }) {
  const searchParams = useSearchParams();
  // Real wall clock, deliberately not `now` — a ?now= in the URL must not be
  // able to argue the page back into test mode once race day arrives.
  const testMode = testModeActive(race, Date.now());
  const now = useSimulatedNow(testMode, searchParams);

  useEffect(() => {
    if (testMode) {
      console.warn(`[hyrox-cheer] ${race.slug} is UNLOCKED — test overrides are live for anyone visiting this page.`);
    }
  }, [testMode, race.slug]);

  /**
   * The real gun, when the wave didn't go off when the schedule said it would.
   * Shared state: it arrives on the same 5-second poll as the marks, so one
   * person fixing a late wave fixes the clock on every phone watching the
   * board. Null means "run to the scheduled time".
   */
  const [startOverrideISO, setStartOverrideISO] = useState<string | null>(null);
  // Same optimistic-then-reconcile trick the marks use, for the same reason: a
  // poll landing between the tap and the write finishing would make the start
  // time visibly snap back, which on this control would be alarming.
  const pendingStart = useRef<{ value: string | null; at: number } | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const scheduledInstant = useMemo(() => new Date(race.startISO), [race.startISO]);

  // ?start= is a private simulation living in one browser's URL and is dead on
  // race day by design (testMode.ts). The override below it is the shared,
  // race-day-legal correction. Highest precedence first.
  const testStartInstant = useMemo(() => {
    if (!testMode) return null;
    const startParam = searchParams.get('start');
    if (!startParam) return null;
    const d = new Date(startParam);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [searchParams, testMode]);

  const overrideInstant = useMemo(() => {
    if (!startOverrideISO) return null;
    const d = new Date(startOverrideISO);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [startOverrideISO]);

  /** What the board as a whole is running on — ignores this browser's ?start=. */
  const sharedStartInstant = overrideInstant ?? scheduledInstant;
  /** What *this* page draws every number from. */
  const startInstant = testStartInstant ?? sharedStartInstant;
  const startSource: 'test' | 'override' | 'scheduled' = testStartInstant
    ? 'test'
    : overrideInstant
      ? 'override'
      : 'scheduled';
  const startShiftSec = (sharedStartInstant.getTime() - scheduledInstant.getTime()) / 1000;

  const cumulative = useMemo(() => {
    let gold = 0;
    let plan = 0;
    return segments.map((seg) => {
      gold += seg.goldSeconds;
      plan += seg.planSeconds;
      return { gold, plan };
    });
  }, [segments]);

  const totalPlan = cumulative[cumulative.length - 1].plan;
  const midIndex = Math.floor(segments.length / 2);

  // Every time of day on this page carries its meridiem and zone ("3:54:30 PM MT")
  // so a spectator can't mistake it for a race-clock duration ("4:30").
  const clockOf = useCallback(
    (date: Date) => formatClock(date, race.timeZone, race.timeZoneLabel),
    [race.timeZone, race.timeZoneLabel]
  );
  const clockAfter = useCallback(
    (seconds: number) => clockOf(new Date(startInstant.getTime() + seconds * 1000)),
    [clockOf, startInstant]
  );
  /** Same time, but with "PM MT" as its own token so a narrow chip can wrap it. */
  const chipClockAfter = useCallback(
    (seconds: number) => {
      const { clock, suffix } = formatClockParts(
        new Date(startInstant.getTime() + seconds * 1000),
        race.timeZone,
        race.timeZoneLabel
      );
      return (
        <>
          {clock} <span className={styles.chipSuffix}>{suffix}</span>
        </>
      );
    },
    [startInstant, race.timeZone, race.timeZoneLabel]
  );

  /**
   * Where she stands on the *whole race* at a given mark — not on the segment
   * that mark ends.
   *
   * These two numbers disagree constantly and that is the point of the race
   * plan: a slow sled push reads red on its own split while the race clock is
   * still comfortably inside the 1:05 line, because the time was banked on the
   * runs before it. So everywhere a segment delta appears, this appears next to
   * it, and this is the one that gets the colour.
   */
  const standingAt = useCallback(
    (elapsedSec: number, index: number) => {
      const vsGold = elapsedSec - cumulative[index].gold;
      const vsPlan = elapsedSec - cumulative[index].plan;
      // Magnitude only — formatDelta always signs, and these read better in
      // prose as "1:12 inside" than "-1:12 inside".
      const mag = (n: number) => formatDelta(n).slice(1);
      if (vsGold <= 0) {
        return {
          tier: 'gold' as const,
          cls: styles.splitGood,
          pill: styles.standingGold,
          banner: styles.deltaAhead,
          short: `${mag(vsGold)} inside ${race.goldLabel}`,
          long: `Overall she is inside the ${race.goldLabel} line by ${mag(vsGold)} — dream-day pace. Tell her.`,
          vsPlan,
        };
      }
      if (vsPlan <= 0) {
        return {
          tier: 'plan' as const,
          cls: styles.splitOk,
          pill: styles.standingPlan,
          banner: styles.deltaOntrack,
          short: `${mag(vsPlan)} up on ${race.planLabel}`,
          long: `Overall she is on the ${race.planLabel} plan with ${mag(vsPlan)} in hand, ${formatDelta(vsGold)} off the ${race.goldLabel} line.`,
          vsPlan,
        };
      }
      return {
        tier: 'behind' as const,
        cls: styles.splitOff,
        pill: styles.standingBehind,
        banner: styles.deltaBehind,
        short: `${mag(vsPlan)} down on ${race.planLabel}`,
        long: `Overall she is ${formatDelta(vsPlan)} past the ${race.planLabel} plan. Still a race — keep cheering.`,
        vsPlan,
      };
    },
    [cumulative, race.goldLabel, race.planLabel]
  );

  const [marks, setMarks] = useState<Record<number, MarkRecord>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  // Segments the viewer has deliberately re-opened for editing. Local to this
  // browser and this visit — it's an "are you sure", not shared state.
  const [unlocked, setUnlocked] = useState<Record<number, boolean>>({});
  // Segment index whose Edit button was tapped and is waiting on a confirm.
  const [confirmEdit, setConfirmEdit] = useState<number | null>(null);
  const noteTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // Anything typed or tapped locally is held here until the server echoes the
  // same value back. Without this, the 5s poll can land between "Mark now" and
  // the write finishing, and the fresh mark visibly disappears and reappears.
  const pending = useRef<Record<number, { record: MarkRecord; at: number }>>({});
  const PENDING_TTL_MS = 20000;

  const mergeWithPending = useCallback((server: Record<number, MarkRecord>) => {
    const merged: Record<number, MarkRecord> = { ...server };
    const nowMs = Date.now();
    for (const key of Object.keys(pending.current)) {
      const i = Number(key);
      const entry = pending.current[i];
      const fromServer = server[i];
      const settled =
        fromServer !== undefined &&
        (fromServer.markedAt ?? null) === (entry.record.markedAt ?? null) &&
        (fromServer.note ?? null) === (entry.record.note ?? null);
      if (settled || nowMs - entry.at > PENDING_TTL_MS) {
        delete pending.current[i];
        continue;
      }
      merged[i] = entry.record;
    }
    return merged;
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/hyrox/cheer/${race.slug}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setMarks(mergeWithPending(data.marks ?? {}));

      // Same reconcile as the marks: hold this browser's own change until the
      // server echoes it, then follow the server from then on.
      const serverStart: string | null = data.startOverrideAt ?? null;
      const p = pendingStart.current;
      const sameInstant = (a: string | null, b: string | null) =>
        a === null || b === null ? a === b : new Date(a).getTime() === new Date(b).getTime();
      if (!p) {
        setStartOverrideISO(serverStart);
      } else if (sameInstant(p.value, serverStart) || Date.now() - p.at > PENDING_TTL_MS) {
        pendingStart.current = null;
        setStartOverrideISO(serverStart);
      }
    } catch {
      // keep whatever we last had; degrade quietly
    }
  }, [race.slug, mergeWithPending]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const applyLocal = useCallback((i: number, record: MarkRecord) => {
    pending.current[i] = { record, at: Date.now() };
    setMarks((prev) => ({ ...prev, [i]: record }));
  }, []);

  const postMark = useCallback(
    async (segmentIndex: number, payload: { markedAt?: string | null; note?: string | null }) => {
      setSaving((prev) => ({ ...prev, [segmentIndex]: true }));
      try {
        await fetch(`/api/hyrox/cheer/${race.slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segmentIndex, ...payload }),
        });
      } catch {
        // fans still see their own optimistic update; the next poll reconciles
      } finally {
        setSaving((prev) => {
          const next = { ...prev };
          delete next[segmentIndex];
          return next;
        });
        // Don't wait up to 5s for the poll to confirm the write landed.
        load();
      }
    },
    [race.slug, load]
  );

  /**
   * Writes the corrected gun to the shared board. `null` puts the scheduled
   * time back. On a refusal the optimistic value is dropped immediately rather
   * than left standing — a start time only this phone believes in is worse than
   * no correction at all.
   */
  const postStartOverride = useCallback(
    async (startAtMs: number | null) => {
      const value = startAtMs === null ? null : new Date(startAtMs).toISOString();
      setStartError(null);
      pendingStart.current = { value, at: Date.now() };
      setStartOverrideISO(value);
      try {
        const res = await fetch(`/api/hyrox/cheer/${race.slug}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startAt: value }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          pendingStart.current = null;
          setStartError(data?.error ?? 'That start time was refused — nothing changed.');
        }
      } catch {
        pendingStart.current = null;
        setStartError('Could not reach the server — the start time did not change.');
      } finally {
        // Don't wait up to 5s to find out what actually stuck.
        load();
      }
    },
    [race.slug, load]
  );

  function setMarkedAt(i: number, iso: string | null) {
    const record: MarkRecord = { markedAt: iso, note: marks[i]?.note ?? null };
    applyLocal(i, record);
    postMark(i, { markedAt: iso });
  }

  function markNow(i: number) {
    setMarkedAt(i, now.toISOString());
    // A fresh mark settles immediately. Matters for the one path that can reach
    // this button while the card is open for editing: clearing a mark with the
    // × and then re-marking it.
    setUnlocked((prev) => {
      const next = { ...prev };
      delete next[i];
      return next;
    });
  }

  function clearAt(i: number) {
    setMarkedAt(i, null);
  }

  function handleAtChange(i: number, value: string) {
    if (!value) {
      clearAt(i);
      return;
    }
    const parsed = parseTimeInputValue(value);
    if (!parsed) return;
    const { year, month, day } = getZonedDateParts(startInstant, race.timeZone);

    // Mobile time pickers hand back "HH:MM" even with step=1, which would
    // silently throw away the seconds on a mark that was timed to the second.
    // If only the seconds are missing and the minute is unchanged, keep them.
    let second = parsed.second;
    const existingISO = marks[i]?.markedAt;
    if (value.split(':').length < 3 && existingISO) {
      const existing = parseTimeInputValue(formatTimeInputValue(new Date(existingISO), race.timeZone));
      if (existing && existing.hour === parsed.hour && existing.minute === parsed.minute) {
        second = existing.second;
      }
    }

    const instant = zonedTimeToInstant(year, month, day, parsed.hour, parsed.minute, second, race.timeZone);
    setMarkedAt(i, instant.toISOString());
  }

  function handleNoteChange(i: number, value: string) {
    setNoteDrafts((prev) => ({ ...prev, [i]: value }));
    clearTimeout(noteTimers.current[i]);
    noteTimers.current[i] = setTimeout(() => {
      applyLocal(i, { markedAt: marks[i]?.markedAt ?? null, note: value });
      postMark(i, { note: value });
    }, 350);
  }

  const clearAllMarks = useCallback(async () => {
    pending.current = {};
    setMarks({});
    setNoteDrafts({});
    setUnlocked({});
    setConfirmEdit(null);
    // DELETE drops the race-state row too, so the gun goes back to scheduled.
    pendingStart.current = null;
    setStartOverrideISO(null);
    setStartError(null);
    try {
      await fetch(`/api/hyrox/cheer/${race.slug}`, { method: 'DELETE' });
    } catch {
      // nothing to do — the next poll will restore whatever is actually stored
    }
    load();
  }, [race.slug, load]);

  // Actual splits: how long each marked segment took, measured from the
  // previous mark (or the gun). A mark with unmarked segments before it covers
  // all of them, so its goal is the sum of those segments' goal durations.
  const splits = useMemo(() => {
    let prevMs = startInstant.getTime();
    let prevIndex = -1;
    return segments.map((_, i) => {
      const iso = marks[i]?.markedAt;
      const markedInstant = iso ? new Date(iso) : null;
      if (!markedInstant || Number.isNaN(markedInstant.getTime())) {
        return null;
      }
      const coversFrom = prevIndex + 1;
      let goalGold = 0;
      let goalPlan = 0;
      for (let j = coversFrom; j <= i; j++) {
        goalGold += segments[j].goldSeconds;
        goalPlan += segments[j].planSeconds;
      }
      const splitSec = (markedInstant.getTime() - prevMs) / 1000;
      const row = {
        index: i,
        markedInstant,
        elapsedSec: (markedInstant.getTime() - startInstant.getTime()) / 1000,
        splitSec,
        outOfOrder: splitSec < 0,
        coversFrom,
        goalGold,
        goalPlan,
      };
      prevMs = markedInstant.getTime();
      prevIndex = i;
      return row;
    });
  }, [marks, segments, startInstant]);

  const markedSplits = splits.filter((s): s is NonNullable<typeof s> => s !== null);
  const lastSplit = markedSplits.length > 0 ? markedSplits[markedSplits.length - 1] : null;

  // The furthest point on the course anyone has marked. Everything behind it is
  // history: she has run past it, so its mark is settled and goes read-only.
  const lastMarkedIndex = lastSplit ? lastSplit.index : -1;

  // The answer to "is she doing OK?", measured at the furthest mark. It rides
  // in the pinned clock bar so it is on screen no matter which card you are
  // looking at — nobody should have to scroll back up to find out.
  const raceStanding = lastSplit ? standingAt(lastSplit.elapsedSec, lastSplit.index) : null;

  /**
   * A segment that has been marked. The moment a time lands it goes read-only —
   * including the one she just finished, which used to keep a live "Re-mark"
   * button sitting under a spectator's thumb on a scrolling phone. Still
   * correctable: Edit (behind a confirm) puts the controls back with the
   * existing time already in them.
   */
  const isSettled = useCallback((i: number) => Boolean(marks[i]?.markedAt), [marks]);

  /**
   * The start-time correction, as a two-screen dialog: pick a gun time, then
   * confirm it on a second screen that spells out what it does. Nothing is
   * written until the second screen's button.
   *
   * Two screens because this single control rewrites the race clock and all 32
   * goal times on every phone watching the board. That is worth three
   * deliberate taps and a changed value; it is not worth one stray thumb.
   *
   * On the confirm screen a null `candidateMs` means "put the scheduled gun
   * back", which is the way out of a correction somebody got wrong.
   */
  const [startDialog, setStartDialog] = useState<
    { step: 'pick'; candidateMs: number } | { step: 'confirm'; candidateMs: number | null } | null
  >(null);

  // Real wall clock and the same rule the API enforces, so the dialog can never
  // offer a time the server will refuse. Re-evaluated every tick, so the
  // control appears on its own when the race-day window opens.
  const startWindowOpen = checkStartOverride(scheduledInstant.getTime(), null, Date.now(), {
    ignoreWindow: testMode,
  }).ok;

  const startCheck =
    startDialog?.step === 'pick'
      ? checkStartOverride(scheduledInstant.getTime(), startDialog.candidateMs, Date.now(), {
          ignoreWindow: testMode,
        })
      : null;

  // What the board would look like with the proposed gun — the numbers a
  // spectator can actually sanity-check against the announcer.
  const startPreview =
    startDialog?.step === 'pick'
      ? {
          gun: clockOf(new Date(startDialog.candidateMs)),
          first: clockOf(new Date(startDialog.candidateMs + cumulative[0].plan * 1000)),
          finish: clockOf(new Date(startDialog.candidateMs + totalPlan * 1000)),
          shiftSec: (startDialog.candidateMs - scheduledInstant.getTime()) / 1000,
          unchanged: startDialog.candidateMs === sharedStartInstant.getTime(),
        }
      : null;

  // A gun set later than a mark someone already logged would put that mark at a
  // negative race clock. Usually it means the wrong field got edited.
  const marksBeforeCandidate =
    startDialog?.step === 'pick'
      ? markedSplits.filter((s) => s.markedInstant.getTime() < startDialog.candidateMs).length
      : 0;

  function openStartDialog() {
    setStartError(null);
    setStartDialog({ step: 'pick', candidateMs: sharedStartInstant.getTime() });
  }

  function nudgeCandidate(deltaMs: number) {
    setStartDialog((d) =>
      d?.step === 'pick' ? { ...d, candidateMs: d.candidateMs + deltaMs } : d
    );
  }

  function setCandidateFromTimeInput(value: string) {
    setStartDialog((d) => {
      if (d?.step !== 'pick') return d;
      const parsed = parseTimeInputValue(value);
      if (!parsed) return d;
      const current = new Date(d.candidateMs);
      // Date parts come from the candidate itself, so nudging past midnight and
      // then typing a time stays on the day the candidate is actually on.
      const { year, month, day } = getZonedDateParts(current, race.timeZone);
      // Same mobile-picker guard as the marks: "HH:MM" back from the OS must
      // not silently throw away seconds the time already had.
      let second = parsed.second;
      if (value.split(':').length < 3) {
        const existing = parseTimeInputValue(formatTimeInputValue(current, race.timeZone));
        if (existing && existing.hour === parsed.hour && existing.minute === parsed.minute) {
          second = existing.second;
        }
      }
      const instant = zonedTimeToInstant(
        year,
        month,
        day,
        parsed.hour,
        parsed.minute,
        second,
        race.timeZone
      );
      return { ...d, candidateMs: instant.getTime() };
    });
  }

  // Focus lands on the button that changes nothing, on both screens, and
  // Escape/backdrop close the whole thing — same contract as the Edit confirm.
  const startSafeRef = useRef<HTMLButtonElement | null>(null);
  const startStep = startDialog?.step ?? null;
  useEffect(() => {
    if (startStep === null) return;
    startSafeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStartDialog(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startStep]);

  // The clock bar pins to the top of the viewport once the legend above it
  // scrolls away. A 1px sentinel just above it tells us when that has happened,
  // so the bar can shrink and drop a shadow instead of silently overlapping.
  const stickySentinel = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = stickySentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The Edit confirm. Focus lands on "Keep it" and Escape / a backdrop tap both
  // cancel, so every cheap way out of this dialog is the one that changes
  // nothing — an accidental Edit tap should cost a spectator one more tap, not
  // a split.
  const keepItRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (confirmEdit === null) return;
    keepItRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmEdit(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmEdit]);

  const [copied, setCopied] = useState(false);
  async function copySplits() {
    const lines = markedSplits.map((s) => {
      const seg = segments[s.index];
      const label =
        s.coversFrom === s.index
          ? seg.name
          : `${segments[s.coversFrom].name} → ${seg.name}`;
      const split = s.outOfOrder ? '--' : formatMinSec(s.splitSec);
      const segVsPlan = s.outOfOrder ? '--' : formatDelta(s.splitSec - s.goalPlan);
      const overall = formatDelta(standingAt(s.elapsedSec, s.index).vsPlan);
      return `${label}\t${split}\t${segVsPlan}\t${formatMinSec(s.elapsedSec)}\t${overall}`;
    });
    const text = [
      `${race.athleteName} — ${race.eventLabel}`,
      `Start ${clockOf(startInstant)} ${formatDateLong(startInstant, race.timeZone)}${
        startSource === 'override'
          ? ` (corrected ${formatDelta(startShiftSec)} from the scheduled ${clockOf(scheduledInstant)})`
          : ''
      }`,
      'Segment\tSplit\tSeg vs plan\tRace clock\tOverall vs plan',
      ...lines,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  // Status banner. `statusSub` is the full sentence; `statusSubStuck` is what
  // replaces it once the bar pins to the top of the viewport, where a
  // three-line sentence would eat half a phone screen on every card.
  const diffSec = (now.getTime() - startInstant.getTime()) / 1000;
  const raceLive = diffSec >= 0 && diffSec < totalPlan + 900;
  let statusMain: string;
  let statusSub: React.ReactNode;
  let statusSubStuck: React.ReactNode;
  let nextIndex: number | null = null;

  if (diffSec < -86400) {
    const days = Math.floor(-diffSec / 86400);
    statusMain = `${days} day${days === 1 ? '' : 's'} until she starts`;
    statusSub = (
      <>
        Wave goes off {formatDateLong(startInstant, race.timeZone)} at{' '}
        <b>{clockOf(startInstant)}</b> sharp.
      </>
    );
    statusSubStuck = (
      <>
        Gun at <b>{clockOf(startInstant)}</b>.
      </>
    );
  } else if (diffSec < 0) {
    const s = Math.floor(-diffSec);
    statusMain = `Starts in ${Math.floor(s / 3600)}h ${`${Math.floor(s / 60) % 60}`.padStart(2, '0')}m`;
    statusSub = (
      <>
        Right now it is <span className={styles.statusClock}>{clockOf(now)}</span>.
      </>
    );
    statusSubStuck = statusSub;
  } else if (diffSec < totalPlan + 900) {
    // Prefer the actual marks fans have logged over the time estimate: once a
    // segment is marked, the athlete is past it, so the gold "next up" box
    // should sit right after the furthest segment anyone has marked so far.
    const timeBasedIndex = segments.findIndex((_, i) => diffSec < cumulative[i].plan);
    nextIndex =
      lastMarkedIndex === -1
        ? timeBasedIndex
        : lastMarkedIndex + 1 >= segments.length
          ? -1
          : lastMarkedIndex + 1;
    statusMain = `Race clock ${formatMinSec(diffSec)}`;
    if (nextIndex === -1) {
      statusSub = 'She should be done. Go find her.';
      statusSubStuck = statusSub;
    } else {
      const seg = segments[nextIndex];
      statusSub = (
        <>
          Next checkpoint: she should be done with <b>{seg.name}</b> by{' '}
          <b>{clockAfter(cumulative[nextIndex].plan)}</b> to stay on the {race.planLabel} plan
          &mdash; {clockAfter(cumulative[nextIndex].gold)} for {race.goldLabel}.
        </>
      );
      statusSubStuck = (
        <>
          Next: <b>{seg.name}</b> by <b>{clockAfter(cumulative[nextIndex].plan)}</b>
        </>
      );
    }
  } else {
    statusMain = 'Race finished';
    statusSub = (
      <>
        Hope she crushed it. Right now it is <span className={styles.statusClock}>{clockOf(now)}</span>.
      </>
    );
    statusSubStuck = (
      <>
        Right now it is <span className={styles.statusClock}>{clockOf(now)}</span>.
      </>
    );
  }

  /**
   * The second clock. The race clock above never resets; this one restarts from
   * zero on every mark, so the bar answers both "how long has she been racing?"
   * and "how long has she been on the stretch she's on right now?" — the second
   * one measured against that single segment's own target, not the race's.
   *
   * Its zero is the last mark anyone logged (the gun, before the first one), so
   * it resets for everybody the moment a mark lands, not just for whoever
   * tapped the button.
   */
  const currentIndex = raceLive && lastMarkedIndex + 1 < segments.length ? lastMarkedIndex + 1 : -1;
  const segmentClock = (() => {
    if (currentIndex === -1) return null;
    const seg = segments[currentIndex];
    const fromMs = lastSplit ? lastSplit.markedInstant.getTime() : startInstant.getTime();
    const elapsedSec = (now.getTime() - fromMs) / 1000;
    // A mistyped mark can sit in the future. A segment clock counting up from a
    // negative number is noise — wait for the real clock to reach it.
    if (elapsedSec < 0) return null;
    const remaining = seg.planSeconds - elapsedSec;
    return {
      name: seg.name,
      elapsedSec,
      planSeconds: seg.planSeconds,
      cls:
        elapsedSec <= seg.goldSeconds
          ? styles.splitGood
          : elapsedSec <= seg.planSeconds
            ? styles.splitOk
            : styles.splitOff,
      note: remaining >= 0 ? `${formatMinSec(remaining)} left` : `${formatDelta(-remaining)} over`,
    };
  })();

  // ?now= / ?start= live in this browser's URL, so a viewer running one sees a
  // different clock from everyone else on the same shared board. Say so.
  const simulating =
    testMode && Boolean(searchParams.get('now') || searchParams.get('start'));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.plate}>
          <ICONS.dino size={46} />
          <div>
            <div className={styles.pre}>Dino Nugget</div>
            <h1 className={styles.h1}>{race.athleteName}</h1>
          </div>
        </div>
        <div className={styles.eventLine}>
          {race.eventLabel}
          <br />
          {formatDateLong(startInstant, race.timeZone)} &middot;{' '}
          {startSource === 'override' ? (
            <>
              wave starts <b>{clockOf(startInstant)}</b>
              <span className={styles.eventLineWas}>
                {' '}
                &mdash; corrected {formatDelta(startShiftSec)} from the scheduled{' '}
                {clockOf(scheduledInstant)}
              </span>
            </>
          ) : (
            <>
              wave starts <b>{clockOf(startInstant)}</b> sharp
            </>
          )}
        </div>
      </header>

      <div className={styles.key}>
        <div className={styles.keyRow}>
          <span className={styles.keyItem}>
            <i className={styles.swatch} style={{ background: '#E9A13C' }} />
            {race.goldLabel} &mdash; dream day
          </span>
          <span className={styles.keyItem}>
            <i className={styles.swatch} style={{ background: '#1D7E96' }} />
            {race.planLabel} &mdash; the race plan
          </span>
        </div>
        <p className={styles.keyNote}>
          Each card shows the <b>time of day</b> she should be <b>done</b> with that segment, and
          the <b>race clock</b> (time since her gun) at that moment. The pace under each segment
          name is her {race.planLabel} plan &mdash; that&rsquo;s the realistic target. Anything
          inside the gold time is a dream day. The clock bar below follows you down the page, and
          the tag on it is the <b>whole race so far</b> &mdash; a red number on a single segment
          further down only means that one stretch was slow.
        </p>
      </div>

      <div ref={stickySentinel} className={styles.statusSentinel} aria-hidden="true" />
      <div className={`${styles.statusBar} ${stuck ? styles.statusBarStuck : ''}`}>
        <div className={styles.status}>
          <div className={styles.statusMain}>{statusMain}</div>
          {segmentClock && (
            <div className={styles.segClock}>
              <span className={styles.segClockLabel}>
                On <b>{segmentClock.name}</b>
              </span>
              <b className={`${styles.segClockTime} ${segmentClock.cls}`}>
                {formatMinSec(segmentClock.elapsedSec)}
              </b>
              <span className={styles.segClockGoal}>
                plan {formatMinSec(segmentClock.planSeconds)} &middot;{' '}
                <b className={segmentClock.cls}>{segmentClock.note}</b>
              </span>
            </div>
          )}
          <div className={styles.statusRow}>
            <div className={styles.statusSub}>{stuck ? statusSubStuck : statusSub}</div>
            {raceStanding && (
              <div className={`${styles.standing} ${raceStanding.pill}`}>
                {raceStanding.short}
                {/* Hidden by CSS once the bar pins, where one short line is the
                    whole budget. */}
                <span className={styles.standingThru}>
                  {' '}
                  through {segments[lastMarkedIndex].name}
                </span>
              </div>
            )}
          </div>
          {/* A corrected gun changes every number above it, so it says so
              permanently — including in the pinned bar, where it is the one
              piece of context that stops the clock looking simply wrong. */}
          {startSource === 'override' && (
            <div className={styles.startShift}>
              <span>
                Gun corrected to <b>{clockOf(sharedStartInstant)}</b>
                <span className={styles.startShiftDelta}>
                  {' '}
                  ({formatDelta(startShiftSec)} vs scheduled)
                </span>
              </span>
              {startWindowOpen && (
                <button
                  type="button"
                  className={styles.startShiftBtn}
                  onClick={openStartDialog}
                  aria-haspopup="dialog"
                >
                  Adjust
                </button>
              )}
            </div>
          )}
          {/* Quiet on purpose: a rare, deliberate action, not something anyone
              should be drawn to. Hidden once the bar pins — a spectator fixing
              a late wave can spare the scroll back up. */}
          {startSource !== 'override' && startWindowOpen && (
            <button
              type="button"
              className={styles.startFixLink}
              onClick={openStartDialog}
              aria-haspopup="dialog"
            >
              Wave went off late? Fix the start time
            </button>
          )}
          {startError && (
            <div className={styles.startErrBar} role="alert">
              {startError}{' '}
              <button type="button" onClick={() => setStartError(null)} aria-label="Dismiss">
                &times;
              </button>
            </div>
          )}
          {simulating && (
            <div className={styles.simBadge}>
              Simulated clock &mdash; only in this browser
            </div>
          )}
        </div>
      </div>

      <ol className={styles.list}>
        {segments.map((seg, i) => {
          const rec = marks[i];
          const markedInstant = rec?.markedAt ? new Date(rec.markedAt) : null;
          const atValue = markedInstant ? formatTimeInputValue(markedInstant, race.timeZone) : '';
          const noteValue = noteDrafts[i] ?? rec?.note ?? '';
          const Icon = ICONS[seg.icon];
          const split = splits[i];
          const isSaving = Boolean(saving[i]);
          const settled = isSettled(i);
          const readOnly = settled && !unlocked[i];

          const standing =
            markedInstant && !Number.isNaN(markedInstant.getTime())
              ? standingAt((markedInstant.getTime() - startInstant.getTime()) / 1000, i)
              : null;
          // A segment slower than its own plan while the race as a whole is
          // still ahead. That is a normal, good race — say so, because the red
          // "+0:18" two lines up reads like bad news on its own.
          const bankedThrough =
            standing !== null &&
            standing.tier !== 'behind' &&
            split !== null &&
            !split.outOfOrder &&
            split.splitSec > split.goalPlan;

          return (
            <li key={seg.index} className={`${styles.card} ${i === nextIndex ? styles.cardNow : ''}`}>
              <div className={styles.top}>
                <span className={styles.icon}>
                  <Icon />
                </span>
                <span className={styles.name}>
                  <b>{seg.name}</b>
                  <small>{seg.meta}</small>
                </span>
              </div>
              <div className={styles.targetsLabel}>Should be done with {seg.name} by</div>
              <div className={styles.targets}>
                <span className={`${styles.chip} ${styles.chipGold}`}>
                  <i>{race.goldLabel} dream day</i>
                  <b>{chipClockAfter(cumulative[i].gold)}</b>
                  <u>race clock {formatMinSec(cumulative[i].gold)}</u>
                </span>
                <span className={`${styles.chip} ${styles.chipTeal}`}>
                  <i>{race.planLabel} plan</i>
                  <b>{chipClockAfter(cumulative[i].plan)}</b>
                  <u>race clock {formatMinSec(cumulative[i].plan)}</u>
                </span>
              </div>
              <p className={styles.yell}>{seg.yell}</p>
              {readOnly ? (
                <div className={styles.logLocked}>
                  <span className={styles.lockedAt}>
                    <i>Marked</i>
                    <b>{markedInstant ? clockOf(markedInstant) : '—'}</b>
                  </span>
                  <button
                    type="button"
                    className={styles.editBtn}
                    aria-label={`Edit the marked time for ${seg.name}`}
                    aria-haspopup="dialog"
                    onClick={() => setConfirmEdit(i)}
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.log}>
                    {/* Only ever offered on a segment with no time on it. Once
                        one lands, the way to change it is Edit → confirm →
                        adjust the prefilled time, never a one-tap overwrite. */}
                    {!markedInstant && (
                      <button
                        type="button"
                        className={styles.markBtn}
                        aria-busy={isSaving}
                        onClick={() => markNow(i)}
                      >
                        {isSaving ? 'Saving…' : 'Mark now'}
                      </button>
                    )}
                    <input
                      className={styles.atInput}
                      type="time"
                      step={1}
                      value={atValue}
                      aria-label={`Actual time for ${seg.name}`}
                      onChange={(e) => handleAtChange(i, e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.clearBtn}
                      aria-label={`Clear ${seg.name}`}
                      onClick={() => clearAt(i)}
                    >
                      &times;
                    </button>
                  </div>
                  {markedInstant && (
                    <div className={styles.markedAt}>
                      {/* Spelled out because the native time picker hides
                          seconds on iOS, and seconds are the whole point. */}
                      <span>
                        Marked at <b>{clockOf(markedInstant)}</b>
                      </span>
                      {settled && (
                        <button
                          type="button"
                          className={styles.doneBtn}
                          onClick={() =>
                            setUnlocked((prev) => {
                              const next = { ...prev };
                              delete next[i];
                              return next;
                            })
                          }
                        >
                          Done
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
              {split && (
                <>
                  <div className={styles.splitRow}>
                    <span className={styles.splitCell}>
                      <i>Split</i>
                      <b>{split.outOfOrder ? '—' : formatMinSec(split.splitSec)}</b>
                      <u>plan {formatMinSec(split.goalPlan)}</u>
                    </span>
                    <span className={styles.splitCell}>
                      <i>vs plan</i>
                      <b
                        className={
                          split.outOfOrder
                            ? ''
                            : split.splitSec <= split.goalGold
                              ? styles.splitGood
                              : split.splitSec <= split.goalPlan
                                ? styles.splitOk
                                : styles.splitOff
                        }
                      >
                        {split.outOfOrder ? '—' : formatDelta(split.splitSec - split.goalPlan)}
                      </b>
                      <u>this segment only</u>
                    </span>
                    {/* The race clock carries the colour, because it is the
                        number that decides the day. The time of day this mark
                        landed is no longer repeated here — it is spelled out in
                        full, with seconds, directly above. */}
                    <span className={styles.splitCell}>
                      <i>Race clock</i>
                      <b className={standing ? standing.cls : ''}>
                        {formatMinSec(split.elapsedSec)}
                      </b>
                      <u>{standing ? standing.short : 'overall'}</u>
                    </span>
                  </div>
                  {bankedThrough && standing && (
                    <div className={styles.splitNote}>
                      Slower than plan on this segment &mdash; but she banked enough earlier that
                      the race clock is still{' '}
                      <b>
                        {standing.tier === 'gold'
                          ? `inside the ${race.goldLabel} line`
                          : `ahead of the ${race.planLabel} plan`}
                      </b>
                      .
                    </div>
                  )}
                  {split.coversFrom !== i && (
                    <div className={styles.splitNote}>
                      This split covers {segments[split.coversFrom].name} &rarr; {seg.name} — the
                      segments in between were never marked.
                    </div>
                  )}
                  {split.outOfOrder && (
                    <div className={styles.splitNote}>
                      This time is earlier than the mark before it — check the order.
                    </div>
                  )}
                </>
              )}
              {standing && (
                <div className={`${styles.delta} ${standing.banner}`}>{standing.long}</div>
              )}
              <input
                className={styles.note}
                type="text"
                placeholder="Note (optional)"
                aria-label={`Note for ${seg.name}`}
                value={noteValue}
                onChange={(e) => handleNoteChange(i, e.target.value)}
              />
            </li>
          );
        })}
      </ol>

      {markedSplits.length > 0 && (
        <section className={styles.recap}>
          <div className={styles.recapHead}>
            <h2 className={styles.recapTitle}>
              {lastSplit && lastSplit.index === segments.length - 1
                ? 'Splits — final'
                : 'Splits so far'}
            </h2>
            <button type="button" className={styles.copyBtn} onClick={copySplits}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className={styles.recapScroll}>
            <table className={styles.recapTable}>
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>Split</th>
                  <th>Seg vs plan</th>
                  <th>Race clock</th>
                  <th>Overall</th>
                </tr>
              </thead>
              <tbody>
                {markedSplits.map((s) => {
                  const st = standingAt(s.elapsedSec, s.index);
                  return (
                    <tr key={s.index}>
                      <th scope="row">
                        {s.coversFrom === s.index
                          ? segments[s.index].name
                          : `${segments[s.coversFrom].name} → ${segments[s.index].name}`}
                      </th>
                      <td>{s.outOfOrder ? '—' : formatMinSec(s.splitSec)}</td>
                      <td
                        className={
                          s.outOfOrder
                            ? ''
                            : s.splitSec <= s.goalGold
                              ? styles.splitGood
                              : s.splitSec <= s.goalPlan
                                ? styles.splitOk
                                : styles.splitOff
                        }
                      >
                        {s.outOfOrder ? '—' : formatDelta(s.splitSec - s.goalPlan)}
                      </td>
                      <td className={st.cls}>{formatMinSec(s.elapsedSec)}</td>
                      <td className={st.cls}>{formatDelta(st.vsPlan)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {lastSplit && (
            <p className={styles.recapTotal}>
              {lastSplit.index === segments.length - 1 ? 'Finish' : 'Through'}{' '}
              <b>{segments[lastSplit.index].name}</b>: <b>{formatMinSec(lastSplit.elapsedSec)}</b>{' '}
              on the race clock at {clockOf(lastSplit.markedInstant)} &mdash;{' '}
              {formatDelta(lastSplit.elapsedSec - cumulative[lastSplit.index].plan)} vs the{' '}
              {race.planLabel} plan and{' '}
              {formatDelta(lastSplit.elapsedSec - cumulative[lastSplit.index].gold)} vs the{' '}
              {race.goldLabel} line.
            </p>
          )}
          <p className={styles.recapFine}>
            Split = time from the previous mark (or the gun) to this one, and &ldquo;seg vs
            plan&rdquo; compares just that stretch against her {race.planLabel} target.
            &ldquo;Overall&rdquo; is the one that decides the day: race clock against the{' '}
            {race.planLabel} plan for the whole race so far. A red segment next to a gold overall
            means she gave a little back on that one but is still up on the race.
          </p>
        </section>
      )}

      <footer className={styles.footer}>
        <p>
          <b>How to use this:</b> each card shows the time of day she should be finishing that
          segment &mdash; e.g. done with Run 1 by{' '}
          <b>{clockAfter(cumulative[0].plan)}</b> on the {race.planLabel} plan. Tap{' '}
          <b>Mark now</b> the moment she clears it and this page will tell you whether she is inside
          the {race.goldLabel} line, on the {race.planLabel} plan, or past it.
        </p>
        <p>
          This board is shared &mdash; everyone watching this page sees the same marks and notes,
          live, as people add them, on any phone or browser. Sarah isn&rsquo;t reading it during
          the race, so cheer freely.
        </p>
        <p>
          The clock bar carries two clocks: the <b>race clock</b>, which runs from her gun and
          never resets, and underneath it the <b>segment clock</b>, which restarts at zero every
          time someone marks a segment &mdash; that one is how long she has been on the stretch
          she&rsquo;s on right now, against that segment&rsquo;s own target.
        </p>
        <p>
          A mark locks the moment it lands, so a stray tap can&rsquo;t overwrite it. Got one wrong?
          Tap <b>Edit</b> on that card and confirm; the time you already logged stays filled in for
          you to adjust, then tap <b>Done</b>.
        </p>
        <p>
          <b>If her wave goes off late</b>, one person can fix it for everybody. Tap{' '}
          <b>Fix the start time</b> in the clock bar, set the gun to when she actually started, and
          confirm on the second screen. The race clock, every &ldquo;should be done by&rdquo; time
          on every card, and the finish estimate all move with it, on every phone watching this
          page. Marks already logged keep the exact times they were logged at &mdash; only their
          race-clock numbers change. It takes two screens on purpose, and it can always be put back
          to the scheduled time.
        </p>
        {startWindowOpen && (
          <button
            type="button"
            className={styles.resetBtn}
            onClick={openStartDialog}
            aria-haspopup="dialog"
          >
            {startSource === 'override'
              ? `Gun is set to ${clockOf(sharedStartInstant)} — adjust it`
              : 'Fix the start time'}
          </button>
        )}
        <p className={styles.fine}>
          Times assume the wave goes off at {clockOf(startInstant)}
          {startSource === 'override'
            ? ` (corrected from the scheduled ${clockOf(scheduledInstant)})`
            : ''}{' '}
          and are her own split targets for a {race.planLabel} finish. Run 1 is short &mdash; it starts in the
          tunnel and skips about 300&nbsp;m, so it is planned at ~700&nbsp;m and is the fastest
          split of the day; runs 2&ndash;8 are 1&nbsp;km each. Each station&rsquo;s target includes
          the roxzone walk out of it, which is where the course-side timing mats sit. The{' '}
          {race.goldLabel} line is the same plan scaled down proportionally. Fuel source:
          100&#37; dino nugget.
        </p>
        <div className={styles.rail}>
          <ICONS.dino size={18} />
          <ICONS.nugget size={18} />
          <ICONS.ketchup size={18} />
          <ICONS.dino size={18} />
          <ICONS.nugget size={18} />
          <ICONS.dino size={18} />
          <ICONS.nugget size={18} />
        </div>
      </footer>

      {confirmEdit !== null && (
        <div
          className={styles.confirmBackdrop}
          onClick={() => setConfirmEdit(null)}
          role="presentation"
        >
          <div
            className={styles.confirmBox}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cheerConfirmTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.confirmTitle} id="cheerConfirmTitle">
              Edit {segments[confirmEdit].name}?
            </h2>
            <p className={styles.confirmBody}>
              It&rsquo;s marked at{' '}
              <b>
                {marks[confirmEdit]?.markedAt
                  ? clockOf(new Date(marks[confirmEdit]!.markedAt!))
                  : '—'}
              </b>
              . Nothing gets erased &mdash; that time stays filled in and you can adjust it.
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                ref={keepItRef}
                className={styles.confirmKeep}
                onClick={() => setConfirmEdit(null)}
              >
                Keep it
              </button>
              <button
                type="button"
                className={styles.confirmGo}
                onClick={() => {
                  setUnlocked((prev) => ({ ...prev, [confirmEdit]: true }));
                  setConfirmEdit(null);
                }}
              >
                Yes, edit
              </button>
            </div>
          </div>
        </div>
      )}

      {startDialog && (
        <div
          className={styles.confirmBackdrop}
          onClick={() => setStartDialog(null)}
          role="presentation"
        >
          <div
            className={`${styles.confirmBox} ${styles.startBox}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cheerStartTitle"
            onClick={(e) => e.stopPropagation()}
          >
            {startDialog.step === 'pick' && startPreview && startCheck ? (
              <>
                <h2 className={styles.confirmTitle} id="cheerStartTitle">
                  Fix the start time
                </h2>
                <p className={styles.confirmBody}>
                  Her wave was scheduled for <b>{clockOf(scheduledInstant)}</b>. Set this to when
                  she actually started and the whole board follows &mdash; for everyone watching,
                  not just this phone.
                </p>

                <div className={styles.startQuick}>
                  {[-5, -1, 1, 5, 15].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => nudgeCandidate(mins * 60 * 1000)}
                    >
                      {mins > 0 ? `+${mins}` : mins} min
                    </button>
                  ))}
                </div>

                <label className={styles.startField}>
                  <span>Gun time ({race.timeZoneLabel})</span>
                  <input
                    className={styles.atInput}
                    type="time"
                    step={1}
                    value={formatTimeInputValue(new Date(startDialog.candidateMs), race.timeZone)}
                    onChange={(e) => setCandidateFromTimeInput(e.target.value)}
                  />
                </label>

                <div className={styles.startPreview}>
                  <div className={styles.startPreviewGun}>
                    <i>New gun</i>
                    <b>{startPreview.gun}</b>
                    <u>
                      {startPreview.shiftSec === 0
                        ? 'the scheduled time'
                        : `${formatDelta(startPreview.shiftSec)} vs scheduled`}
                    </u>
                  </div>
                  <div className={styles.startPreviewRows}>
                    <div>
                      <span>{segments[0].name} due</span>
                      <b>{startPreview.first}</b>
                    </div>
                    <div>
                      <span>{race.planLabel} finish</span>
                      <b>{startPreview.finish}</b>
                    </div>
                  </div>
                </div>

                {!startCheck.ok && <p className={styles.startErr}>{startCheck.error}</p>}
                {marksBeforeCandidate > 0 && (
                  <p className={styles.startWarn}>
                    {marksBeforeCandidate === 1
                      ? 'One mark already logged is earlier than this gun time, so its race clock would run backwards.'
                      : `${marksBeforeCandidate} marks already logged are earlier than this gun time, so their race clocks would run backwards.`}{' '}
                    Double-check before you confirm.
                  </p>
                )}

                <div className={styles.confirmActions}>
                  <button
                    type="button"
                    ref={startSafeRef}
                    className={styles.confirmKeep}
                    onClick={() => setStartDialog(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.confirmGo}
                    disabled={!startCheck.ok || startPreview.unchanged}
                    onClick={() =>
                      setStartDialog({ step: 'confirm', candidateMs: startDialog.candidateMs })
                    }
                  >
                    Continue
                  </button>
                </div>

                {startSource === 'override' && (
                  <button
                    type="button"
                    className={styles.startResetLink}
                    onClick={() => setStartDialog({ step: 'confirm', candidateMs: null })}
                  >
                    Put the gun back to the scheduled {clockOf(scheduledInstant)}
                  </button>
                )}
              </>
            ) : startDialog.step === 'confirm' ? (
              (() => {
                // The second screen. Everything here is read-only: the only way
                // forward is the one button, and it says exactly what it sets.
                const target =
                  startDialog.candidateMs === null
                    ? scheduledInstant.getTime()
                    : startDialog.candidateMs;
                const shift = (target - scheduledInstant.getTime()) / 1000;
                const isReset = startDialog.candidateMs === null;
                const n = markedSplits.length;
                // A gun that moves later makes a fixed wall-clock mark read as a
                // *smaller* race clock, hence the flipped sign.
                const clockShift = (target - sharedStartInstant.getTime()) / 1000;
                return (
                  <>
                    <h2 className={styles.confirmTitle} id="cheerStartTitle">
                      {isReset ? 'Put the gun back?' : 'Set the gun for everyone?'}
                    </h2>
                    <div className={styles.startBig}>{clockOf(new Date(target))}</div>
                    <div className={styles.startBigSub}>
                      {shift === 0
                        ? 'the scheduled start time'
                        : `${formatDelta(shift)} ${shift > 0 ? 'later' : 'earlier'} than scheduled`}
                    </div>
                    <p className={styles.confirmBody}>
                      This resets the race clock and every goal time on this page for{' '}
                      <b>everyone watching</b> &mdash; not just this phone.
                      {n > 0 && (
                        <>
                          {' '}
                          {n === 1
                            ? 'The one mark already logged keeps the exact time it was logged at; its race-clock number shifts by '
                            : `All ${n} marks already logged keep the exact times they were logged at; their race-clock numbers shift by `}
                          <b>{formatDelta(-clockShift)}</b>.
                        </>
                      )}
                    </p>
                    <div className={styles.confirmActions}>
                      <button
                        type="button"
                        ref={startSafeRef}
                        className={styles.confirmKeep}
                        onClick={() =>
                          setStartDialog({
                            step: 'pick',
                            candidateMs: isReset ? sharedStartInstant.getTime() : target,
                          })
                        }
                      >
                        Go back
                      </button>
                      <button
                        type="button"
                        className={`${styles.confirmGo} ${styles.confirmDanger}`}
                        onClick={() => {
                          setStartDialog(null);
                          postStartOverride(startDialog.candidateMs);
                        }}
                      >
                        {isReset
                          ? 'Yes, use the scheduled time'
                          : `Yes, she started at ${clockOf(new Date(target))}`}
                      </button>
                    </div>
                  </>
                );
              })()
            ) : null}
          </div>
        </div>
      )}

      {testMode && (
        <TestPanel
          race={race}
          startInstant={startInstant}
          totalPlanSeconds={totalPlan}
          midpointGoldSeconds={cumulative[midIndex].gold}
          midpointPlanSeconds={cumulative[midIndex].plan}
          onClearMarks={clearAllMarks}
        />
      )}
    </div>
  );
}
