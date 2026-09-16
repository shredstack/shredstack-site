'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './cheer.module.css';
import { ICONS } from './icons';
import { TestPanel } from './TestPanel';
import type { RaceConfig, Segment } from '@/lib/hyroxCheer/races/slc2026';
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

function useSimulatedNow(locked: boolean, searchParams: URLSearchParams): Date {
  const nowParam = locked ? null : searchParams.get('now');
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
  const now = useSimulatedNow(race.locked, searchParams);

  useEffect(() => {
    if (!race.locked) {
      console.warn(`[hyrox-cheer] ${race.slug} is UNLOCKED — test overrides are live for anyone visiting this page.`);
    }
  }, [race.locked, race.slug]);

  const startInstant = useMemo(() => {
    if (!race.locked) {
      const startParam = searchParams.get('start');
      if (startParam) {
        const d = new Date(startParam);
        if (!Number.isNaN(d.getTime())) return d;
      }
    }
    return new Date(race.startISO);
  }, [race, searchParams]);

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

  const [marks, setMarks] = useState<Record<number, MarkRecord>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
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

  function setMarkedAt(i: number, iso: string | null) {
    const record: MarkRecord = { markedAt: iso, note: marks[i]?.note ?? null };
    applyLocal(i, record);
    postMark(i, { markedAt: iso });
  }

  function markNow(i: number) {
    setMarkedAt(i, now.toISOString());
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

  const [copied, setCopied] = useState(false);
  async function copySplits() {
    const lines = markedSplits.map((s) => {
      const seg = segments[s.index];
      const label =
        s.coversFrom === s.index
          ? seg.name
          : `${segments[s.coversFrom].name} → ${seg.name}`;
      const split = s.outOfOrder ? '--' : formatMinSec(s.splitSec);
      return `${label}\t${split}\t${formatMinSec(s.elapsedSec)}`;
    });
    const text = [
      `${race.athleteName} — ${race.eventLabel}`,
      `Start ${clockOf(startInstant)} ${formatDateLong(startInstant, race.timeZone)}`,
      'Segment\tSplit\tRace clock',
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

  // Status banner
  const diffSec = (now.getTime() - startInstant.getTime()) / 1000;
  let statusMain: string;
  let statusSub: React.ReactNode;
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
  } else if (diffSec < 0) {
    const s = Math.floor(-diffSec);
    statusMain = `Starts in ${Math.floor(s / 3600)}h ${`${Math.floor(s / 60) % 60}`.padStart(2, '0')}m`;
    statusSub = (
      <>
        Right now it is <span className={styles.statusClock}>{clockOf(now)}</span>.
      </>
    );
  } else if (diffSec < totalPlan + 900) {
    // Prefer the actual marks fans have logged over the time estimate: once a
    // segment is marked, the athlete is past it, so the gold "next up" box
    // should sit right after the furthest segment anyone has marked so far.
    let lastMarkedIndex = -1;
    for (let i = 0; i < segments.length; i++) {
      if (marks[i]?.markedAt) lastMarkedIndex = i;
    }
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
    } else {
      const seg = segments[nextIndex];
      statusSub = (
        <>
          Next checkpoint: she should be done with <b>{seg.name}</b> by{' '}
          <b>{clockAfter(cumulative[nextIndex].plan)}</b> to stay on the {race.planLabel} plan
          &mdash; {clockAfter(cumulative[nextIndex].gold)} for {race.goldLabel}.
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
  }

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
          {formatDateLong(new Date(race.startISO), race.timeZone)} &middot; wave starts{' '}
          <b>{formatClock(new Date(race.startISO), race.timeZone, race.timeZoneLabel)}</b> sharp
        </div>
      </header>

      <div className={styles.status}>
        <div className={styles.statusMain}>{statusMain}</div>
        <div className={styles.statusSub}>{statusSub}</div>
      </div>

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
          inside the gold time is a dream day.
        </p>
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

          let deltaClass = '';
          let deltaMsg: React.ReactNode = null;
          if (markedInstant) {
            const elapsed = (markedInstant.getTime() - startInstant.getTime()) / 1000;
            const vsGold = elapsed - cumulative[i].gold;
            const vsPlan = elapsed - cumulative[i].plan;
            if (vsGold <= 0) {
              deltaClass = styles.deltaAhead;
              deltaMsg = `Inside the ${race.goldLabel} line by ${formatDelta(-vsGold).slice(1)} — dream-day pace. Tell her.`;
            } else if (vsPlan <= 0) {
              deltaClass = styles.deltaOntrack;
              deltaMsg = `On the ${race.planLabel} plan with ${formatDelta(-vsPlan).slice(1)} in hand, ${formatDelta(vsGold)} off the ${race.goldLabel} line.`;
            } else {
              deltaClass = styles.deltaBehind;
              deltaMsg = `${formatDelta(vsPlan)} past the ${race.planLabel} plan. Still a race — keep cheering.`;
            }
          }

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
              <div className={styles.log}>
                <button
                  type="button"
                  className={styles.markBtn}
                  aria-busy={isSaving}
                  onClick={() => markNow(i)}
                >
                  {isSaving ? 'Saving…' : markedInstant ? 'Re-mark' : 'Mark now'}
                </button>
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
                      <u>on this segment</u>
                    </span>
                    <span className={styles.splitCell}>
                      <i>Race clock</i>
                      <b>{formatMinSec(split.elapsedSec)}</b>
                      {/* Zone label omitted here only — the cell is a third of a card
                          wide, and the target chips right above already carry it. */}
                      <u>at {formatClock(split.markedInstant, race.timeZone)}</u>
                    </span>
                  </div>
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
              {deltaMsg && <div className={`${styles.delta} ${deltaClass}`}>{deltaMsg}</div>}
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
                  <th>vs plan</th>
                  <th>Race clock</th>
                </tr>
              </thead>
              <tbody>
                {markedSplits.map((s) => (
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
                    <td>{formatMinSec(s.elapsedSec)}</td>
                  </tr>
                ))}
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
            Split = time from the previous mark (or the gun) to this one. &ldquo;vs plan&rdquo;
            compares that against her {race.planLabel} target for the same stretch; gold means she
            beat the {race.goldLabel} target too.
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
          live, as people add them. Sarah isn&rsquo;t reading it during the race, so cheer freely.
        </p>
        <p className={styles.fine}>
          Times assume the wave goes off at{' '}
          {formatClock(new Date(race.startISO), race.timeZone, race.timeZoneLabel)} and are her own
          split targets for a {race.planLabel} finish. Run 1 is short &mdash; it starts in the
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

      {!race.locked && (
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
